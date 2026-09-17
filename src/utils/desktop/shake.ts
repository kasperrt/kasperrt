type Axis = { origin: number; peak: number; direction: number; reversals: number; lastTurn: number };

export function createShakeDetector(x: number, y: number) {
  const axes: Axis[] = [x, y].map((position) => ({
    origin: position,
    peak: position,
    direction: 0,
    reversals: 0,
    lastTurn: 0,
  }));
  return (nextX: number, nextY: number, time: number): boolean => {
    return [nextX, nextY].some((position, index) => {
      const axis = axes[index];
      if (!axis.direction || time - axis.lastTurn > 350) {
        const distance = position - axis.origin;
        if (Math.abs(distance) < 28) return false;
        axis.direction = Math.sign(distance);
        axis.peak = position;
        axis.reversals = 0;
        axis.lastTurn = time;
      } else if ((position - axis.peak) * axis.direction > 0) {
        axis.peak = position;
      } else if ((axis.peak - position) * axis.direction >= 28) {
        axis.direction *= -1;
        axis.origin = axis.peak;
        axis.peak = position;
        axis.lastTurn = time;
        axis.reversals++;
      }
      return axis.reversals >= 3;
    });
  };
}
