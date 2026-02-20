import React from 'react';
import { View, Text, Image, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/theme';

interface AvatarProps {
    uri?: string;
    name: string;
    size?: number;
    showOnlineIndicator?: boolean;
    style?: StyleProp<ViewStyle>;
}

export default function Avatar({ uri, name, size = 48, showOnlineIndicator = false, style }: AvatarProps) {
    const getInitials = (fullName: string) => {
        const names = fullName.trim().split(' ');
        if (names.length === 0) return '';
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <View style={[{ width: size, height: size, borderRadius: size / 2, position: 'relative' }, style]}>
            {uri ? (
                <Image
                    source={{ uri }}
                    style={{ width: size, height: size, borderRadius: size / 2, resizeMode: 'cover' }}
                />
            ) : (
                <View
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: '#D4B896', // Sand background
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: size * 0.4, color: COLORS.surface }}>
                        {getInitials(name)}
                    </Text>
                </View>
            )}

            {showOnlineIndicator && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: size * 0.25,
                        height: size * 0.25,
                        borderRadius: (size * 0.25) / 2,
                        backgroundColor: COLORS.semantic.success,
                        borderWidth: 2,
                        borderColor: COLORS.surface,
                    }}
                />
            )}
        </View>
    );
}
