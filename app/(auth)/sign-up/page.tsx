import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SignUpContent from './sign-up-content';

export const metadata: Metadata = {
  title: 'Sign Up',
};

const SignUpPage = async (props: {
  searchParams: Promise<{
    callbackUrl: string;
  }>;
}) => {
  const { callbackUrl } = await props.searchParams;

  const session = await auth();

  if (session) {
    return redirect(callbackUrl || '/');
  }

  return <SignUpContent callbackUrl={callbackUrl || '/'} />;
};

export default SignUpPage;
