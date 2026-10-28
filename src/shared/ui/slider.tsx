import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

// shadcn/ui Slider (Radix): keyboard support (arrows, Home/End, PageUp/Down)
// and one focusable thumb per value. Styled like the Figma price filter.
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels = [],
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn('relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-primary/40">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels[index]}
          className="block size-[15px] shrink-0 rounded-full border-2 border-text-secondary bg-primary transition-shadow focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
