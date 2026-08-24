export default function DiscussLogo({ size = 'md', className = '', dark = false, tagged = false }) {
  const sizes = {
    xs: 'text-xl',
    sm: 'text-2xl',
    md: 'text-[28px] sm:text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };
  const sizeClass = sizes[size] || sizes.md;

  return (
    <span className={`inline-flex items-center select-none leading-none ${className}`} aria-label="Discuss">
      {tagged && <span className={`${sizeClass} font-semibold text-[#EF4444]`} aria-hidden="true">&lt;</span>}
      <span
        className={`font-script tracking-wide font-normal inline-block transform -rotate-[1deg] transition-colors duration-200 ${sizeClass} ${dark ? 'text-white' : 'text-neutral-900 dark:text-white'}`}
        style={{ fontFamily: "'Grand Hotel', 'Pacifico', cursive, sans-serif" }}
      >
        Discuss
      </span>
      {tagged && <span className={`${sizeClass} font-semibold text-[#0095F6]`} aria-hidden="true">/&gt;</span>}
    </span>
  );
}
