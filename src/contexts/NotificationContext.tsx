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

export const NotificationContext = createContext<NotificationContextType>({
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

  // Check if push notifications are supported
  useEffect(() => {
    const checkPushSupport = async () => {
      try {
        // Check if service workers are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          setIsPushSupported(true);
          
          // Register service worker
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          setSwRegistration(registration);
          
          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } else {
          console.log('Push notifications are not supported in this browser');
          setIsPushSupported(false);
        }
      } catch (error) {
        console.error('Error checking push support:', error);
        setIsPushSupported(false);
      }
    };
    
    if (user) {
      checkPushSupport();
    }
  }, [user]);

  // Subscribe to push notifications
  const subscribeToNotifications = async () => {
    try {
      if (!swRegistration) {
        throw new Error('Service worker not registered');
      }
      
      // Get public key from server
      let publicKey;
      try {
        const response = await fetch('/api/notifications/public-key');
        if (!response.ok) {
          throw new Error(`Failed to fetch public key: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        publicKey = data.publicKey;
      } catch (error) {
        console.error('Error fetching public key:', error);
        throw new Error('Could not fetch public key from server');
      }
      
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
        body: JSON.stringify({ subscription }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription on server');
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
    try {
      if (!swRegistration) {
        throw new Error('Service worker not registered');
      }
      
      const subscription = await swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        throw new Error('No subscription found');
      }
      
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Remove subscription from server
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.toJSON().keys.p256dh,
              auth: subscription.toJSON().keys.auth
            }
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
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
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
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

  // Helper function to convert base64 to Uint8Array
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