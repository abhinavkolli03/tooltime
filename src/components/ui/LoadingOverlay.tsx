import React from 'react';
import { View, Modal, ActivityIndicator, Text } from 'react-native';
import { COLORS } from '@/constants/theme';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(28, 20, 16, 0.6)', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
                {message && (
                    <Text style={{ fontFamily: 'DMSans-Medium', color: COLORS.surface, marginTop: 16, fontSize: 16 }}>{message}</Text>
                )}
            </View>
        </Modal>
    );
}
