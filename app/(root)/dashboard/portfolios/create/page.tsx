'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortfolio } from '@/lib/actions/portfolios.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const initialState = {
  message: '',
};

export default function CreatePortfolioPage() {
  const [state, formAction] = useActionState(createPortfolio, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.message === "Portfolio created successfully.") {
      router.push('/dashboard');
    }
  }, [state.message, router]);

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Create a New Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name</Label>
              <Input id="name" name="name" placeholder="e.g., My Growth Portfolio" required />
            </div>

            <div className="space-y-2">
              <Label>Risk Tolerance</Label>
              <RadioGroup name="riskTolerance" defaultValue="MEDIUM" className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LOW" id="low" />
                  <Label htmlFor="low">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MEDIUM" id="medium" />
                  <Label htmlFor="medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HIGH" id="high" />
                  <Label htmlFor="high">High</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetReturn">Target Return (%)</Label>
              <Input id="targetReturn" name="targetReturn" type="number" placeholder="e.g., 8.5" required />
            </div>

            {state.message && (
              <p className={`text-sm ${state.issues ? 'text-red-500' : 'text-green-500'}`}>
                {state.message}
              </p>
            )}

            <Button type="submit">Create Portfolio</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
