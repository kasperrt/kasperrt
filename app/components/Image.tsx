import { type HTMLAttributes, type RefObject, useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';

interface Props extends Omit<HTMLAttributes<HTMLImageElement>, 'className'> {
  ref?: RefObject<HTMLImageElement | null>;
  sources: {
    srcSet: string;
    type: string;
  }[];
  alt: string;
  imageClass?: string;
  pictureClass?: string;
}

export function Image({ pictureClass, imageClass, sources, alt, ref, onLoad: onInheritLoad, ...rest }: Props) {
  if (!sources) {
    return null;
  }

  const internalRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const fallback = sources[sources.length - 1];

  const onLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setLoaded(true);
    onInheritLoad?.(event);
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const c = ref?.current ?? internalRef?.current;
    if (!c || !c.complete) {
      return;
    }

    c.dispatchEvent(new Event('load'));
  }, [ref]);

  return (
    <picture className={pictureClass}>
      {sources.map((props) => (
        <source key={props.srcSet} {...props} />
      ))}

      <img
        {...rest}
        ref={ref ?? internalRef}
        alt={alt}
        src={fallback.srcSet}
        className={classNames(
          imageClass,
          'transition-opacity duration-300',
          !imageClass?.includes('opacity-') && loaded && 'opacity-100',
          !loaded && '!opacity-0',
        )}
        onLoad={onLoad}
      />
    </picture>
  );
}
