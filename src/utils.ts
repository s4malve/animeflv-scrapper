export const getBgImgDependsOnTime = (hour: number) => {
  const times = [
    {
      name: 'night',
      minMax: [0, 4]
    },
    {
      name: 'morning',
      minMax: [5, 11]
    },
    {
      name: 'afternoon',
      minMax: [12, 18]
    },
    {
      name: 'night',
      minMax: [19, 24]
    }
  ]

  const currentTime = times.find(
    ({ minMax: [min, max] }) => hour >= min && hour <= max
  )
  const timeName = currentTime?.name

  return `${timeName}-cover.jpg`
}
