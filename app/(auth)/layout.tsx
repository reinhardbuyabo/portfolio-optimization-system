export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <div className="min-h-screen w-full bg-[#020618]">{children}</div>;
}
