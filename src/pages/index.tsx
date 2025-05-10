import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { FaMapMarkerAlt, FaUserCheck, FaChartLine, FaMobileAlt } from "react-icons/fa";

// Dynamically import framer-motion with SSR disabled to prevent hydration issues
const MotionDiv = dynamic(() => import('framer-motion').then(mod => mod.motion.div), { ssr: false });
const MotionSection = dynamic(() => import('framer-motion').then(mod => mod.motion.section), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're running on client side before rendering motion components
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <>
      <Head>
        <title>TimeTrack | Employee Management System</title>
        <meta name="description" content="Modern employee management system with geofencing-based attendance tracking" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-background min-h-screen flex flex-col">
        <Header />
        
        {isClient ? (
          <>
            {/* Hero Section */}
            <MotionSection 
              className="relative py-20 md:py-28 px-4 overflow-hidden"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <MotionDiv variants={fadeIn}>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                    Modern Workforce Management <span className="text-primary">Simplified</span>
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                    Streamline your workforce operations with our geofencing-based attendance system. 
                    Track employee attendance, manage shifts, and generate reports with ease.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      size="lg" 
                      onClick={() => router.push("/signup")}
                      className="px-8"
                    >
                      Get Started
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => router.push("/login")}
                      className="px-8"
                    >
                      Log In
                    </Button>
                  </div>
                </MotionDiv>
                
                <MotionDiv 
                  className="relative"
                  variants={fadeIn}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" 
                    alt="Employee Management" 
                    className="rounded-lg object-cover w-full h-[400px]"
                  />
                </MotionDiv>
              </div>
            </MotionSection>
            
            {/* Features Section */}
            <MotionSection 
              className="py-20 px-4 bg-muted/50"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <div className="max-w-7xl mx-auto">
                <MotionDiv 
                  className="text-center mb-16"
                  variants={fadeIn}
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Our comprehensive solution offers everything you need to manage your workforce efficiently
                  </p>
                </MotionDiv>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <MotionDiv 
                    className="bg-card p-6 rounded-lg"
                    variants={fadeIn}
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaMapMarkerAlt className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Geofencing</h3>
                    <p className="text-muted-foreground">
                      Ensure employees are at the right location with 50-meter radius geofencing technology
                    </p>
                  </MotionDiv>
                  
                  <MotionDiv 
                    className="bg-card p-6 rounded-lg"
                    variants={fadeIn}
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaUserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
                    <p className="text-muted-foreground">
                      Monitor check-ins and check-outs in real-time with GPS verification
                    </p>
                  </MotionDiv>
                  
                  <MotionDiv 
                    className="bg-card p-6 rounded-lg"
                    variants={fadeIn}
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaChartLine className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
                    <p className="text-muted-foreground">
                      Generate comprehensive reports on attendance, overtime, and compliance
                    </p>
                  </MotionDiv>
                  
                  <MotionDiv 
                    className="bg-card p-6 rounded-lg"
                    variants={fadeIn}
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaMobileAlt className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
                    <p className="text-muted-foreground">
                      Access the system from any device with our responsive design
                    </p>
                  </MotionDiv>
                </div>
              </div>
            </MotionSection>
            
            {/* CTA Section */}
            <MotionSection 
              className="py-20 px-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Workforce Management?</h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of companies that have streamlined their operations with TimeTrack
                </p>
                <Button 
                  size="lg" 
                  onClick={() => router.push("/signup")}
                  className="px-8"
                >
                  Start Your Free Trial
                </Button>
              </div>
            </MotionSection>
          </>
        ) : (
          // Fallback non-animated content while client-side rendering initializes
          <>
            {/* Hero Section - Static Version */}
            <section className="relative py-20 md:py-28 px-4 overflow-hidden">
              <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                    Modern Workforce Management <span className="text-primary">Simplified</span>
                  </h1>
                  <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                    Streamline your workforce operations with our geofencing-based attendance system. 
                    Track employee attendance, manage shifts, and generate reports with ease.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      size="lg" 
                      onClick={() => router.push("/signup")}
                      className="px-8"
                    >
                      Get Started
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => router.push("/login")}
                      className="px-8"
                    >
                      Log In
                    </Button>
                  </div>
                </div>
                
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" 
                    alt="Employee Management" 
                    className="rounded-lg object-cover w-full h-[400px]"
                  />
                </div>
              </div>
            </section>
            
            {/* Features Section - Static Version */}
            <section className="py-20 px-4 bg-muted/50">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Our comprehensive solution offers everything you need to manage your workforce efficiently
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-card p-6 rounded-lg">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaMapMarkerAlt className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Geofencing</h3>
                    <p className="text-muted-foreground">
                      Ensure employees are at the right location with 50-meter radius geofencing technology
                    </p>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaUserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
                    <p className="text-muted-foreground">
                      Monitor check-ins and check-outs in real-time with GPS verification
                    </p>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaChartLine className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
                    <p className="text-muted-foreground">
                      Generate comprehensive reports on attendance, overtime, and compliance
                    </p>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg">
                    <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <FaMobileAlt className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
                    <p className="text-muted-foreground">
                      Access the system from any device with our responsive design
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* CTA Section - Static Version */}
            <section className="py-20 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Workforce Management?</h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of companies that have streamlined their operations with TimeTrack
                </p>
                <Button 
                  size="lg" 
                  onClick={() => router.push("/signup")}
                  className="px-8"
                >
                  Start Your Free Trial
                </Button>
              </div>
            </section>
          </>
        )}
        
        {/* Footer */}
        <footer className="py-8 px-4 border-t">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-muted-foreground">
                © 2025 TimeTrack. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}