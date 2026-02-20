import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface ScreenHeaderProps {
    title?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    leftAction?: React.ReactNode;
}

export default function ScreenHeader({ title, showBack = false, rightAction, leftAction }: ScreenHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ paddingTop: insets.top, backgroundColor: COLORS.bg.primary }}>
            <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    {showBack ? (
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    ) : leftAction ? leftAction : null}
                </View>

                {title && (
                    <View style={{ flex: 2, alignItems: 'center' }}>
                        <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 17, color: COLORS.text.primary }}>
                            {title}
                        </Text>
                    </View>
                )}

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {rightAction}
                </View>
            </View>
        </View>
    );
}
