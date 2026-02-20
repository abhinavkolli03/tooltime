import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tool } from '@/types/tool.types';
import { COLORS } from '@/constants/theme';
import Badge from '../ui/Badge';

interface ToolCardProps {
    tool: Tool;
    distance?: number;
    onPress: () => void;
}

export default function ToolCard({ tool, distance, onPress }: ToolCardProps) {
    const getConditionColor = () => {
        switch (tool.condition) {
            case 'like_new': return COLORS.semantic.success;
            case 'good': return COLORS.semantic.warning;
            case 'fair': return COLORS.semantic.error;
            default: return '#D4B896';
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
                flexDirection: 'row',
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E0D4C0',
            }}
        >
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: tool.photoUrls[0] || 'https://via.placeholder.com/72' }}
                    style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: '#F0EBE1' }}
                />
                <View
                    style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: getConditionColor(),
                        borderWidth: 2,
                        borderColor: COLORS.surface,
                    }}
                />
            </View>

            <View style={{ flex: 1, marginLeft: 16, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 15, color: COLORS.text.primary }} numberOfLines={1}>
                            {tool.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Badge label={tool.category.replace('_', ' ')} variant="default" style={{ paddingVertical: 2, paddingHorizontal: 6 }} />
                        </View>
                    </View>
                    <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 18, color: COLORS.accent.primary }}>
                        ${tool.hourlyRate}/hr
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.text.muted, marginLeft: 4 }}>
                            {tool.rating.toFixed(1)} ({tool.totalRentals})
                        </Text>
                    </View>
                    {distance !== undefined && (
                        <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.text.muted }}>
                            {distance.toFixed(1)} mi
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
