import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaUserCheck, FaChartLine, FaMobileAlt } from "react-icons/fa";

export default function Home() {
  const router = useRouter();

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
        
        {/* Hero Section */}
        <motion.section 
          className="relative py-20 md:py-28 px-4 overflow-hidden"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeIn}>
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
            </motion.div>
            
            <motion.div 
              className="relative"
              variants={fadeIn}
            >
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" 
                alt="Employee Management" 
                className="rounded-lg object-cover w-full h-[400px]"
              />
            </motion.div>
          </div>
        </motion.section>
        
        {/* Features Section */}
        <motion.section 
          className="py-20 px-4 bg-muted/50"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="text-center mb-16"
              variants={fadeIn}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our comprehensive solution offers everything you need to manage your workforce efficiently
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div 
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
              </motion.div>
              
              <motion.div 
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
              </motion.div>
              
              <motion.div 
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
              </motion.div>
              
              <motion.div 
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
              </motion.div>
            </div>
          </div>
        </motion.section>
        
        {/* CTA Section */}
        <motion.section 
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
        </motion.section>
        
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
