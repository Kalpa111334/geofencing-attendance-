import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from "@/components/ui/use-toast";

interface NotificationContextType {
  isSubscribed: boolean;
  isPushSupported: boolean;
  subscribeToNotifications: () => Promise<void>;
  unsubscribeFromNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isSubscribed: false,
  isPushSupported: false,
  subscribeToNotifications: async () => {},
  unsubscribeFromNotifications: async () => {},
  sendTestNotification: async () => {},
});

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported and register service worker
  useEffect(() => {
    const checkPushSupport = async () => {
      if (!user) return;
      
      try {
        // Check if service workers and push are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          setIsPushSupported(true);
          
          // Register service worker
          const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
          });
          
          setSwRegistration(registration);
          
          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
          
          console.log('Service Worker registered successfully');
        } else {
          console.log('Push notifications are not supported in this browser');
          setIsPushSupported(false);
        }
      } catch (error) {
        console.error('Error registering service worker:', error);
        setIsPushSupported(false);
      }
    };
    
    checkPushSupport();
  }, [user]);

  // Convert base64 to Uint8Array (for VAPID key)
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribeToNotifications = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to subscribe to notifications",
      });
      return;
    }

    try {
      if (!swRegistration) {
        throw new Error('Service worker not registered');
      }
      
      // Get public key from server
      const response = await fetch('/api/notifications/public-key');
      if (!response.ok) {
        throw new Error(`Failed to fetch public key: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const publicKey = data.publicKey;
      
      if (!publicKey) {
        throw new Error('Public key not available');
      }
      
      // Convert base64 to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      // Subscribe to push notifications
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      
      // Send subscription to server
      const saveResponse = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscription: subscription.toJSON() 
        }),
        credentials: 'include'
      });
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save subscription on server: ${saveResponse.status} ${saveResponse.statusText}`);
      }
      
      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You will now receive push notifications",
      });
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to subscribe to notifications',
      });
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromNotifications = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to unsubscribe from notifications",
      });
      return;
    }

    try {
      if (!swRegistration) {
        throw new Error('Service worker not registered');
      }
      
      const subscription = await swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        throw new Error('No subscription found');
      }
      
      // Unsubscribe from push manager
      const successful = await subscription.unsubscribe();
      
      if (!successful) {
        throw new Error('Failed to unsubscribe from push manager');
      }
      
      // Remove subscription from server
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          endpoint: subscription.endpoint 
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to remove subscription from server: ${response.status} ${response.statusText}`);
      }
      
      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications",
      });
    } catch (error: any) {
      console.error('Error unsubscribing from notifications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to unsubscribe from notifications',
      });
    }
  };

  // Send a test notification
  const sendTestNotification = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to send a test notification",
      });
      return;
    }

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send test notification: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "Test Notification Sent",
        description: "You should receive a notification shortly",
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to send test notification',
      });
    }
  };

  return (
    <NotificationContext.Provider value={{
      isSubscribed,
      isPushSupported,
      subscribeToNotifications,
      unsubscribeFromNotifications,
      sendTestNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);