import { useLocalSearchParams } from 'expo-router'
import { CreateResourceScreen } from '../../../../src/farms/CreateResourceScreen'
export default function CreateZone() { const { farmId } = useLocalSearchParams<{ farmId: string }>(); return <CreateResourceScreen farmId={farmId} /> }
