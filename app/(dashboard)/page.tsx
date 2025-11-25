export default function NewUiIndex() {
  return (
    <div className="space-y-6 text-slate-200">
      <h1 className="text-2xl font-semibold">New UI scaffold</h1>
      <p>
        This route group is mounted under <code className="text-slate-400">/new</code>. We will migrate screens here and
        verify end-to-end before flipping routes.
      </p>
      <ul className="list-disc list-inside space-y-2 text-slate-300">
        <li>Landing: will become <code className="text-slate-400">/new/landing</code></li>
        <li>Dashboard: will become <code className="text-slate-400">/new/dashboard</code></li>
        <li>Auth pages: <code className="text-slate-400">/new/login</code>, <code className="text-slate-400">/new/twofa</code></li>
      </ul>
    </div>
  );
}