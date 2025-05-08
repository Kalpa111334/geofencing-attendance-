import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@/util/supabase/component'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()
  const { createUser } = useAuth();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await createUser(session.user);
          
          // Check user role and redirect accordingly
          const { data } = await supabase
            .from('User')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (data && data.role === 'ADMIN') {
            router.push('/admin-dashboard');
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error creating user:', error);
          router.push('/dashboard');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, createUser, supabase])

  return null
}