export default function DiscussLogo({ size = 'md', className = '', dark = false }) {
  const sizes = {
    xs: 'text-xl',
    sm: 'text-2xl',
    md: 'text-[28px] sm:text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  return (
    <span 
      className={`font-script tracking-wide font-normal select-none inline-block transform -rotate-[1deg] leading-none transition-colors duration-200 ${sizes[size] || sizes.md} ${
        dark ? 'text-white' : 'text-neutral-900 dark:text-white'
      } ${className}`}
      style={{ fontFamily: "'Grand Hotel', 'Pacifico', cursive, sans-serif" }}
    >
      Discuss
    </span>
  );
}
