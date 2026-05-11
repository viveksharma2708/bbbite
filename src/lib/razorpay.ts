interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, string>;
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
  };
  config?: any;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    
    const timeout = setTimeout(() => {
      console.error('Razorpay SDK load timeout');
      resolve(false);
    }, 10000); // 10s timeout

    script.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const initializeRazorpayPayment = async (options: Partial<RazorpayOptions>) => {
  console.log('Attempting to initialize Razorpay with options:', { ...options, handler: 'function' });
  
  if (!window.Razorpay) {
    console.log('Razorpay SDK not found, loading...');
    const loaded = await loadRazorpay();
    if (!loaded) {
      throw new Error('Razorpay SDK failed to load. Please check your internet connection and try again.');
    }
    console.log('Razorpay SDK loaded successfully');
  }

  try {
    const rzp = new window.Razorpay(options);
    
    rzp.on('payment.failed', function (response: any) {
      console.error('Payment failed:', response.error);
      // We don't throw here as the 'handler' won't be called, but we can log
    });

    rzp.open();
    console.log('Razorpay modal opened');
  } catch (error: any) {
    console.error('Error creating Razorpay instance:', error);
    throw new Error(`Failed to open payment gateway: ${error.message || 'Unknown error'}`);
  }
};
