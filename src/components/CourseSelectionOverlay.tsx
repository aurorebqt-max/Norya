import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
export function CourseSelectionOverlay({ children, onClose, x, y }: { children: ReactNode; onClose: () => void; x: number; y: number }) {
  const isWeb = Platform.OS === 'web';
  return <Modal transparent visible onRequestClose={onClose}>
    {isWeb ? (
      <View style={{ flex: 1 }} onTouchEnd={onClose} onStartShouldSetResponder={() => true} onResponderRelease={onClose}>
        <View style={{ position: 'absolute', left: x, top: y, maxWidth: 340 }}>
          <Pressable onPress={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
            {children}
          </Pressable>
        </View>
      </View>
    ) : (
      <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.2)' }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    )}
  </Modal>;
}
