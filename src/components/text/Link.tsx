import { ReactNode } from "react";
import { Link as LinkRouter } from "react-router-dom";

export function MwLink(props: {
  children?: ReactNode;
  to?: string;
  url?: string;
  onClick?: () => void;
}) {
  const isExternal = !!props.url;
  const isInternal = !!props.to;
  const onClick = props.onClick;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault(); // Space would otherwise scroll the page
    onClick();
  };

  const content = (
    <span className="group mt-1 cursor-pointer font-bold text-type-link hover:text-type-linkHover active:scale-95">
      {props.children}
    </span>
  );

  if (isExternal)
    return (
      <a href={props.url} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  if (isInternal) return <LinkRouter to={props.to ?? ""}>{content}</LinkRouter>;
  return (
    <span
      className="tabbable"
      onClick={() => onClick && onClick()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {content}
    </span>
  );
}
