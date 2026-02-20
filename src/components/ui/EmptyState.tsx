import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';

interface EmptyStateProps {
    iconName?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ iconName = 'alert-circle-outline', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name={iconName} size={48} color={COLORS.text.muted} style={{ marginBottom: 16 }} />
            <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary, textAlign: 'center', marginBottom: 8 }}>
                {title}
            </Text>
            {subtitle && (
                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 16, color: COLORS.text.muted, textAlign: 'center', marginBottom: 24 }}>
                    {subtitle}
                </Text>
            )}
            {actionLabel && onAction && (
                <Button label={actionLabel} onPress={onAction} style={{ minWidth: 200 }} />
            )}
        </View>
    );
}
