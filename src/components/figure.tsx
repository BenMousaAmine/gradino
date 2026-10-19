import type { Figure } from "@/lib/items/figure";


function Label({
  x,
  y,
  text,
  anchor = "middle",
}: {
  x: number;
  y: number;
  text?: string;
  anchor?: "start" | "middle" | "end";
}) {
  if (!text) return null;
  const unknown = text.includes("?");
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={15}
      fontWeight={unknown ? 700 : 500}
      strokeWidth={5}
      strokeLinejoin="round"
      paintOrder="stroke"
      className={`stroke-surface ${unknown ? "fill-brand" : "fill-ink"}`}
    >
      {text}
    </text>
  );
}

function Dashed({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-brand" strokeWidth={2} strokeDasharray="6 5" />;
}

function RightAngle({ x, y, dx, dy }: { x: number; y: number; dx: number; dy: number }) {
  return (
    <polyline
      points={`${x + dx},${y} ${x + dx},${y + dy} ${x},${y + dy}`}
      fill="none"
      className="stroke-ink"
      strokeWidth={1.5}
    />
  );
}

function Shape({ figure }: { figure: Figure }) {
  const common = { className: "fill-brand-soft stroke-ink", strokeWidth: 2.5, strokeLinejoin: "round" as const };
  switch (figure.shape) {
    case "rectangle":
      return (
        <>
          <rect x={50} y={30} width={170} height={100} {...common} />
          {figure.diagonal && <Dashed x1={50} y1={130} x2={220} y2={30} />}
          <Label x={135} y={152} text={figure.base} />
          <Label x={42} y={80} text={figure.height} anchor="end" />
          <Label x={142} y={68} text={figure.diagonal} anchor="start" />
        </>
      );
    case "square":
      return (
        <>
          <rect x={80} y={25} width={110} height={110} {...common} />
          {figure.diagonal && <Dashed x1={80} y1={135} x2={190} y2={25} />}
          <Label x={135} y={155} text={figure.side} />
          <Label x={145} y={70} text={figure.diagonal} anchor="start" />
        </>
      );
    case "triangle":
      return (
        <>
          <polygon points="40,135 220,135 130,25" {...common} />
          {figure.height && (
            <>
              <Dashed x1={130} y1={25} x2={130} y2={135} />
              <RightAngle x={130} y={135} dx={10} dy={-10} />
            </>
          )}
          <Label x={130} y={155} text={figure.base} />
          <Label x={138} y={88} text={figure.height} anchor="start" />
          <Label x={78} y={72} text={figure.left} anchor="end" />
          <Label x={182} y={72} text={figure.right} anchor="start" />
        </>
      );
    case "right-triangle":
      return (
        <>
          <polygon points="60,135 220,135 60,25" {...common} />
          <RightAngle x={60} y={135} dx={12} dy={-12} />
          <Label x={50} y={80} text={figure.legA} anchor="end" />
          <Label x={140} y={155} text={figure.legB} />
          <Label x={146} y={70} text={figure.hypotenuse} anchor="start" />
        </>
      );
    case "trapezoid":
      return (
        <>
          <polygon points="30,135 230,135 180,35 80,35" {...common} />
          {figure.height && (
            <>
              <Dashed x1={80} y1={35} x2={80} y2={135} />
              <RightAngle x={80} y={135} dx={10} dy={-10} />
            </>
          )}
          <Label x={130} y={22} text={figure.top} />
          <Label x={130} y={155} text={figure.bottom} />
          <Label x={88} y={88} text={figure.height} anchor="start" />
          <Label x={214} y={82} text={figure.leg} anchor="start" />
        </>
      );
    case "rhombus":
      return (
        <>
          <polygon points="130,20 225,85 130,150 35,85" {...common} />
          <Dashed x1={35} y1={85} x2={225} y2={85} />
          <Dashed x1={130} y1={20} x2={130} y2={150} />
          <Label x={180} y={100} text={figure.d1} />
          <Label x={138} y={45} text={figure.d2} anchor="start" />
          <Label x={186} y={44} text={figure.side} anchor="start" />
        </>
      );
    case "triangle-angles":
      return (
        <>
          <polygon points="40,135 220,135 150,28" {...common} />
          <Label x={68} y={124} text={figure.a} />
          <Label x={192} y={124} text={figure.b} />
          <Label x={150} y={58} text={figure.c} />
        </>
      );
  }
}

export function FigureView({ figure }: { figure: Figure }) {
  return (
    <svg viewBox="0 0 260 170" className="mx-auto w-full max-w-72" role="img" aria-label="figura">
      <Shape figure={figure} />
    </svg>
  );
}
