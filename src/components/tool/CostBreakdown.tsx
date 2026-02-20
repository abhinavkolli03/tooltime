import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface CostBreakdownProps {
    rentalFee: number;
    deliveryFee?: number;
    platformFee: number;
    depositAmount: number;
}

const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
};

export default function CostBreakdown({ rentalFee, deliveryFee = 0, platformFee, depositAmount }: CostBreakdownProps) {
    const total = rentalFee + deliveryFee + platformFee;

    return (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E0D4C0' }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary, marginBottom: 16 }}>
                Payment Details
            </Text>

            <View style={{ gap: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'DMSans-Regular', color: COLORS.text.secondary }}>Rental fee</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono-Regular', color: COLORS.text.primary }}>{formatCurrency(rentalFee)}</Text>
                </View>
                {deliveryFee > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'DMSans-Regular', color: COLORS.text.secondary }}>Delivery fee</Text>
                        <Text style={{ fontFamily: 'JetBrainsMono-Regular', color: COLORS.text.primary }}>{formatCurrency(deliveryFee)}</Text>
                    </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'DMSans-Regular', color: COLORS.text.secondary }}>Platform fee</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono-Regular', color: COLORS.text.primary }}>{formatCurrency(platformFee)}</Text>
                </View>
            </View>

            <View style={{ height: 1, backgroundColor: '#E0D4C0', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary }}>Total</Text>
                <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.accent.primary }}>
                    {formatCurrency(total)}
                </Text>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: '#F5F0E8', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.text.muted} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.text.primary }}>
                        Security Deposit: {formatCurrency(depositAmount)}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.text.muted }}>
                        Pre-authorized, not charged
                    </Text>
                </View>
            </View>
        </View>
    );
}
