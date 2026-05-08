export default function DiscussLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <span className={`font-heading font-bold italic ${sizes[size]} ${className}`}>
      <span className="text-[#2563EB]">&lt;</span>
      <span className="text-[#BC4800]">discuss</span>
      <span className="text-[#2563EB]">&gt;</span>
    </span>
  );
}
