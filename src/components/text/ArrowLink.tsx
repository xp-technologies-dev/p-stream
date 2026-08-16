import { Link as LinkRouter } from "react-router-dom";

import { Icon, Icons } from "@/components/Icon";

interface IArrowLinkPropsBase {
  linkText: string;
  className?: string;
  onClick?: () => void;
  direction?: "left" | "right";
}

interface IArrowLinkPropsExternal extends IArrowLinkPropsBase {
  url: string;
}

interface IArrowLinkPropsInternal extends IArrowLinkPropsBase {
  to: string;
}

export type ArrowLinkProps =
  | IArrowLinkPropsExternal
  | IArrowLinkPropsInternal
  | IArrowLinkPropsBase;

export function ArrowLink(props: ArrowLinkProps) {
  const direction = props.direction || "right";
  const isExternal = !!(props as IArrowLinkPropsExternal).url;
  const isInternal = !!(props as IArrowLinkPropsInternal).to;
  const onClick = props.onClick;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault(); // Space would otherwise scroll the page
    onClick();
  };

  const content = (
    <span className="group mt-1 inline-flex cursor-pointer items-center space-x-1 pr-1 font-bold text-type-link hover:text-type-linkHover active:scale-95">
      {direction === "left" ? (
        <span className="text-xl transition-transform group-hover:-translate-x-1">
          <Icon icon={Icons.ARROW_LEFT} />
        </span>
      ) : null}
      <span className="flex-1">{props.linkText}</span>
      {direction === "right" ? (
        <span className="text-xl transition-transform group-hover:translate-x-1">
          <Icon icon={Icons.ARROW_RIGHT} />
        </span>
      ) : null}
    </span>
  );

  if (isExternal)
    return <a href={(props as IArrowLinkPropsExternal).url}>{content}</a>;
  if (isInternal)
    return (
      <LinkRouter to={(props as IArrowLinkPropsInternal).to}>
        {content}
      </LinkRouter>
    );
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
