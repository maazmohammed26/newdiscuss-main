export default function DiscussLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <span className={`font-heading font-black italic select-none tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-[#E53E3E] font-black">&lt;</span>
      <span className="text-white font-extrabold tracking-tight">discuss</span>
      <span className="text-[#3182CE] font-black">&gt;</span>
    </span>
  );
}
