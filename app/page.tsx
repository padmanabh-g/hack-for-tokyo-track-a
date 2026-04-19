import { getAllData } from '@/lib/data'
import { MapView } from '@/components/MapView'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getAllData()
  return <MapView data={data} />
}
