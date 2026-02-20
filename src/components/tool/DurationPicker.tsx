import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface DurationPickerProps {
    mode: 'hourly' | 'daily';
    value: number;
    onModeChange: (mode: 'hourly' | 'daily') => void;
    onValueChange: (value: number) => void;
    hourlyRate: number;
    dailyRate: number;
}

export default function DurationPicker({ mode, value, onModeChange, onValueChange, hourlyRate, dailyRate }: DurationPickerProps) {
    const maxVal = mode === 'hourly' ? 24 : 7;

    const handleMinus = () => {
        if (value > 1) onValueChange(value - 1);
    };

    const handlePlus = () => {
        if (value < maxVal) onValueChange(value + 1);
    };

    return (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E0D4C0' }}>
            {/* Segmented Toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F5F0E8', borderRadius: 8, padding: 4, marginBottom: 20 }}>
                <TouchableOpacity
                    onPress={() => { onModeChange('hourly'); onValueChange(1); }}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: mode === 'hourly' ? COLORS.surface : 'transparent', borderRadius: 6, shadowColor: mode === 'hourly' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
                >
                    <Text style={{ fontFamily: 'DMSans-Medium', color: mode === 'hourly' ? COLORS.text.primary : COLORS.text.muted }}>Hourly</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.accent.primary }}>${hourlyRate}/hr</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => { onModeChange('daily'); onValueChange(1); }}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: mode === 'daily' ? COLORS.surface : 'transparent', borderRadius: 6, shadowColor: mode === 'daily' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
                >
                    <Text style={{ fontFamily: 'DMSans-Medium', color: mode === 'daily' ? COLORS.text.primary : COLORS.text.muted }}>Daily</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.accent.primary }}>${dailyRate}/d</Text>
                </TouchableOpacity>
            </View>

            {/* Stepper */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                    onPress={handleMinus}
                    disabled={value <= 1}
                    style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: value <= 1 ? '#F5F0E8' : 'rgba(196, 98, 42, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="remove" size={24} color={value <= 1 ? '#D4B896' : COLORS.accent.primary} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary }}>
                        {value} {mode === 'hourly' ? (value === 1 ? 'hour' : 'hours') : (value === 1 ? 'day' : 'days')}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={handlePlus}
                    disabled={value >= maxVal}
                    style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: value >= maxVal ? '#F5F0E8' : 'rgba(196, 98, 42, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="add" size={24} color={value >= maxVal ? '#D4B896' : COLORS.accent.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
