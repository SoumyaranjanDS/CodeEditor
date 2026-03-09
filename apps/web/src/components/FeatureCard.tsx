type FeatureCardProps = {
  title: string;
  text: string;
};

export default function FeatureCard({ title, text }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-[#2d2d30] bg-[#1e1e1e] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#4fc1ff]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{text}</p>
    </div>
  );
}
