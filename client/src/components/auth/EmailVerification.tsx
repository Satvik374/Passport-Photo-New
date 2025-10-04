import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailVerificationSchema, type EmailVerificationRequest } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, RotateCcw, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface EmailVerificationProps {
  email: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function EmailVerification({ email, onSuccess, onBack }: EmailVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmailVerificationRequest>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      email,
      verificationCode: '',
    },
  });

  const onSubmit = async (data: EmailVerificationRequest) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/verify-email', data);
      const result = await response.json();

      if (result.success) {
        // Show success animation first
        setVerificationSuccess(true);
        
        // Invalidate auth cache to refetch user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: '🎉 Email Verified Successfully!',
          description: 'Welcome to Passport Photo Generator! You can now create professional passport photos.',
          duration: 5000,
        });
        
        // Delay the transition to show the success animation
        setTimeout(() => {
          onSuccess?.();
        }, 2500);
      } else {
        toast({
          title: 'Verification Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const response = await apiRequest('POST', '/api/auth/resend-verification', { email });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Code Sent!',
          description: result.message,
        });
        form.reset({ email, verificationCode: '' });
      } else {
        toast({
          title: 'Failed to Resend',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Resend',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  // Success animation screen
  if (verificationSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 animate-in fade-in-0 duration-500">
        <CardContent className="p-20 text-center">
          <div className="space-y-8">
            {/* Animated checkmark */}
            <div className="mx-auto relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-700 delay-100 shadow-2xl">
                <CheckCircle2 className="w-12 h-12 text-white animate-in zoom-in-50 duration-500 delay-300" />
              </div>
              
              {/* Celebration particles */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full celebration-bounce delay-500 shadow-lg"></div>
              <div className="absolute -top-4 -right-1 w-3 h-3 bg-blue-400 rounded-full celebration-bounce delay-700 shadow-lg"></div>
              <div className="absolute -bottom-1 -left-4 w-2 h-2 bg-pink-400 rounded-full celebration-bounce delay-1000 shadow-lg"></div>
              <div className="absolute -bottom-3 -right-3 w-3 h-3 bg-purple-400 rounded-full celebration-bounce delay-1200 shadow-lg"></div>
              <div className="absolute top-6 -left-6 w-2 h-2 bg-green-400 rounded-full celebration-bounce delay-300 shadow-lg"></div>
              <div className="absolute top-8 -right-4 w-3 h-3 bg-orange-400 rounded-full celebration-bounce delay-900 shadow-lg"></div>
              
              {/* Expanding ring effect */}
              <div className="absolute inset-0 border-4 border-green-300 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-2 border-2 border-green-400 rounded-full animate-ping opacity-50 animation-delay-150"></div>
            </div>

            {/* Success message */}
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-500">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Email Verified!
              </h2>
              <p className="text-lg text-green-700 dark:text-green-300">
                Welcome to Passport Photo Generator
              </p>
              <p className="text-green-600 dark:text-green-400">
                Redirecting you to create professional photos...
              </p>
            </div>

            {/* Loading dots */}
            <div className="flex justify-center space-x-2 animate-in fade-in-0 duration-500 delay-1000">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <CardHeader className="space-y-6 text-center pb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            We've sent a 6-digit verification code to<br />
            <span className="font-semibold text-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md mt-2 inline-block">
              {email}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="verificationCode"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-center block text-lg font-medium">
                    Enter Verification Code
                  </FormLabel>
                  <FormControl>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={field.onChange}
                        className="gap-3"
                      >
                        <InputOTPGroup className="gap-3">
                          <InputOTPSlot 
                            index={0} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                          <InputOTPSlot 
                            index={1} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                          <InputOTPSlot 
                            index={2} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                          <InputOTPSlot 
                            index={3} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                          <InputOTPSlot 
                            index={4} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                          <InputOTPSlot 
                            index={5} 
                            className="w-12 h-12 text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 shadow-sm" 
                          />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </FormControl>
                  <FormMessage className="text-center" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]" 
              disabled={isLoading || form.watch('verificationCode').length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Verify Email
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-6 pt-8">
        <div className="flex items-center justify-center space-x-6">
          <button 
            onClick={handleResendCode}
            disabled={isResending}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 hover:shadow-md"
          >
            {isResending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Resend Code
          </button>
          
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Code expires in 15 minutes
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Check your spam folder if you don't see the email. The code is case-sensitive.
              </p>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}