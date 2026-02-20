import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Tool } from '@/types/tool.types';
import { COLORS } from '@/constants/theme';

interface ToolPinProps {
    tool: Tool;
    isSelected?: boolean;
    onPress: () => void;
}

export default function ToolPin({ tool, isSelected = false, onPress }: ToolPinProps) {
    const getCategoryIcon = () => {
        switch (tool.category) {
            case 'power_tools': return 'flash';
            case 'hand_tools': return 'hammer';
            case 'outdoor': return 'leaf';
            case 'plumbing': return 'water';
            case 'electrical': return 'flash';
            case 'measuring': return 'expand';
            default: return 'build';
        }
    };

    return (
        <Marker
            coordinate={{ latitude: tool.lat, longitude: tool.lng }}
            onPress={onPress}
            tracksViewChanges={false}
            style={{ zIndex: isSelected ? 10 : 1 }}
        >
            <View style={[
                styles.pinContainer,
                isSelected && styles.pinSelected
            ]}>
                <Ionicons
                    name={getCategoryIcon() as any}
                    size={14}
                    color={COLORS.accent.primary}
                />
                <Text style={styles.priceText}>
                    ${(tool.hourlyRate / 100).toFixed(0)}/hr
                </Text>
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    pinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        height: 36,
        minWidth: 52,
        borderRadius: 8,
        gap: 4,
        shadowColor: '#1C1410',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    pinSelected: {
        borderColor: COLORS.accent.primary,
        borderWidth: 2,
        height: 40,
        minWidth: 56,
    },
    priceText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: COLORS.accent.primary,
    }
});
