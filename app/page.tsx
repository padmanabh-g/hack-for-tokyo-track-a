import { getAllData } from '@/lib/data'
import { MapView } from '@/components/MapView'

export default async function Page() {
  const data = await getAllData()
  return <MapView data={data} />
}
