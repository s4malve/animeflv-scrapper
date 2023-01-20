export const getBgImgDependsOnTime = (hour: number) => {
  const times = {
    morning: { min: 6, max: 11 },
    afternoon: { min: 12, max: 18 },
    night: { min: 19, max: 5 }
  }
  const timesEntries = Object.entries(times)
  const currentTime = timesEntries.find(
    ([_, { max, min }]) => hour >= min && hour <= max
  )
  const [timeName] = currentTime ?? ['']

  return `${timeName}-cover.jpg`
}
