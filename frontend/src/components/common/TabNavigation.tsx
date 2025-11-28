import React from 'react'
import { Mic2, MessageSquare, Music } from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export const TabNavigation: React.FC = () => {
  return (
    <TabsList className="grid w-full grid-cols-3 gap-1">
      <TabsTrigger value="enrollment" className="flex items-center gap-2">
        <Mic2 className="h-4 w-4" />
        <span className="hidden sm:inline">Voice Enrollment</span>
        <span className="sm:hidden">Enroll</span>
      </TabsTrigger>
      <TabsTrigger value="synthesis" className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Speech Synthesis</span>
        <span className="sm:hidden">Speak</span>
      </TabsTrigger>
      <TabsTrigger value="song" className="flex items-center gap-2">
        <Music className="h-4 w-4" />
        <span className="hidden sm:inline">Song Generation</span>
        <span className="sm:hidden">Song</span>
      </TabsTrigger>
    </TabsList>
  )
}
