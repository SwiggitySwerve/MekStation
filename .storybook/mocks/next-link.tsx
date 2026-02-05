import React, { ReactNode, AnchorHTMLAttributes, forwardRef } from 'react';

interface LinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  href: string | { pathname: string; query?: Record<string, string> };
  children: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, onClick, ...props },
  ref,
) {
  const hrefString =
    typeof href === 'string'
      ? href
      : href.pathname +
        (href.query ? '?' + new URLSearchParams(href.query).toString() : '');

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    console.log('[Storybook Link] Navigation to:', hrefString);
    onClick?.(e);
  };

  return (
    <a ref={ref} href={hrefString} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});

export default Link;
