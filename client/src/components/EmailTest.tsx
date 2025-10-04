import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, CheckCircle } from 'lucide-react';

export function EmailTest() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const { toast } = useToast();

  const testEmailService = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test the service.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      
      if (result.success) {
        setVerificationCode(result.verificationCode);
        toast({
          title: "Email Sent Successfully!",
          description: "Check the console logs for the verification code (development mode).",
        });
      } else {
        toast({
          title: "Email Failed",
          description: result.message || "Failed to send test email",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Email test error:', error);
      toast({
        title: "Request Failed",
        description: "Failed to test email service",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle>Test Email Service</CardTitle>
        <CardDescription>
          Send a verification code to test the email system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={testEmailService} 
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Test Email
            </div>
          )}
        </Button>

        {verificationCode && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Email Sent!</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              Verification code (development mode):
            </p>
            <div className="bg-white dark:bg-gray-800 border rounded p-3 text-center">
              <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                {verificationCode}
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              In production, this code would be sent to the email address instead of displayed here.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• If SMTP credentials are configured, real emails are sent</p>
          <p>• Otherwise, codes appear in console (development mode)</p>
          <p>• Perfect for testing without external dependencies</p>
        </div>
      </CardContent>
    </Card>
  );
}