import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useStripe } from '@stripe/stripe-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { COLORS } from '@/constants/theme';
import { createBooking } from '@/services/cloudFunctions';
import { Tool } from '@/types/tool.types';
import Button from '@/components/ui/Button';

const DURATION_PRESETS = [
    { label: '2 hrs', value: 2 },
    { label: '4 hrs', value: 4 },
    { label: '8 hrs', value: 8 },
    { label: '1 day', value: 24 },
];

export default function BookingModal() {
    const { toolId, toolData: toolDataRaw } = useLocalSearchParams();
    const router = useRouter();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [tool, setTool] = useState<Tool | null>(null);
    const [durationHours, setDurationHours] = useState(4);
    const [startTime, setStartTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTool = async () => {
            if (toolDataRaw) {
                try {
                    setTool(JSON.parse(toolDataRaw as string));
                    setIsLoading(false);
                    return;
                } catch (e) {
                    console.error('Failed to parse toolData', e);
                }
            }

            if (toolId) {
                const docSnap = await getDoc(doc(db, 'tools', toolId as string));
                if (docSnap.exists()) {
                    setTool({ id: docSnap.id, ...docSnap.data() } as Tool);
                }
            }
            setIsLoading(false);
        };
        fetchTool();
    }, [toolId, toolDataRaw]);

    const costs = useMemo(() => {
        if (!tool) return null;
        const rentalFee = (durationHours * tool.hourlyRate); // in cents
        const platformFee = Math.round(rentalFee * 0.1);
        const deliveryFee = tool.deliveryFee || 800;
        const total = rentalFee + platformFee + deliveryFee;
        const deposit = tool.depositAmount;
        return { rentalFee, platformFee, deliveryFee, total, deposit };
    }, [tool, durationHours]);

    const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    const handleConfirm = async () => {
        if (!tool || !costs) return;
        setIsProcessing(true);

        try {
            // 1. Create booking and get Payment Intents
            const result = await createBooking({
                toolId: tool.id,
                durationHours,
                // Location coords would ideally come from a store
                borrowerLat: 30.2672,
                borrowerLng: -97.7431,
            });

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to initiate booking');
            }

            const { bookingId, depositClientSecret } = result.data;

            // 2. Handle Mock Payment for Demo (since we are on Spark plan without Cloud Functions)
            if (depositClientSecret.startsWith('pi_mock')) {
                console.log('Demo Mode: Simulating PaymentSheet...');
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
                // Success!
                router.replace('/(borrower)/track');
                return;
            }

            // 2. Initialize Real Payment Sheet (if on Blaze/Production)
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: depositClientSecret,
                merchantDisplayName: 'ToolTime',
                returnURL: 'stripe-tooltime://stripe-redirect',
                style: 'alwaysLight',
                appearance: {
                    colors: {
                        primary: COLORS.accent.primary,
                    }
                }
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User closed the sheet
                } else {
                    throw new Error(presentError.message);
                }
                setIsProcessing(false);
                return;
            }

            // Success!
            router.replace('/(borrower)/track');
        } catch (error: any) {
            Alert.alert('Booking Error', error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    if (!tool || !costs) {
        return (
            <View style={styles.centered}>
                <Text>Tool not found</Text>
                <Button label="Close" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Tool Summary */}
                <View style={styles.toolCard}>
                    <Image source={{ uri: tool.photoUrls?.[0] }} style={styles.toolImg} />
                    <View style={styles.toolInfo}>
                        <Text style={styles.toolName}>{tool.name}</Text>
                        <Text style={styles.toolCategory}>{tool.category.replace('_', ' ').toUpperCase()}</Text>
                        <Text style={styles.toolPrice}>{formatCurrency(tool.hourlyRate)}/hr</Text>
                    </View>
                </View>

                {/* Duration Picker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How long do you need it?</Text>
                    <View style={styles.presetRow}>
                        {DURATION_PRESETS.map((p) => (
                            <TouchableOpacity
                                key={p.value}
                                style={[styles.presetChip, durationHours === p.value && styles.presetChipActive]}
                                onPress={() => setDurationHours(p.value)}
                            >
                                <Text style={[styles.presetText, durationHours === p.value && styles.presetTextActive]}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.stepperRow}>
                        <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => setDurationHours(h => Math.max(1, h - 1))}
                        >
                            <Ionicons name="remove" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                        <View style={styles.stepperValueContainer}>
                            <Text style={styles.stepperValue}>{durationHours}</Text>
                            <Text style={styles.stepperLabel}>hours</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => setDurationHours(h => h + 1)}
                        >
                            <Ionicons name="add" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Start Time */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>When should it arrive?</Text>
                    <TouchableOpacity
                        style={styles.datePickerBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={COLORS.accent.primary} />
                        <Text style={styles.dateText}>
                            {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={startTime}
                            mode="datetime"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (date) setStartTime(date);
                            }}
                            minimumDate={new Date()}
                        />
                    )}
                </View>

                {/* Cost Breakdown */}
                <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>Cost Breakdown</Text>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Rental fee ({durationHours} hrs)</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(costs.rentalFee)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Delivery fee</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(costs.deliveryFee)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Platform fee (10%)</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(costs.platformFee)}</Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Estimated</Text>
                        <Text style={styles.totalValue}>{formatCurrency(costs.total)}</Text>
                    </View>

                    <View style={styles.depositNotice}>
                        <Ionicons name="shield-checkmark" size={16} color="#5A7A4A" />
                        <Text style={styles.depositText}>
                            {formatCurrency(costs.deposit)} security deposit will be authorized. Fully refundable.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmBtn, isProcessing && styles.disabledBtn]}
                    onPress={handleConfirm}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Confirm & Request</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.footerNote}>You won't be charged until the lender accepts.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
        position: 'relative',
    },
    headerTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
    },
    scrollContent: {
        padding: 24,
    },
    toolCard: {
        flexDirection: 'row',
        backgroundColor: '#F5F0E8',
        borderRadius: 16,
        padding: 12,
        marginBottom: 24,
    },
    toolImg: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    toolInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    toolName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    toolCategory: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: '#9A8070',
        marginTop: 4,
    },
    toolPrice: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 18,
        color: COLORS.accent.primary,
        marginTop: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.text.primary,
        marginBottom: 16,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    presetChip: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDE4D4',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    presetChipActive: {
        backgroundColor: COLORS.accent.primary,
        borderColor: COLORS.accent.primary,
    },
    presetText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#9A8070',
    },
    presetTextActive: {
        color: '#FFFFFF',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    stepperBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValueContainer: {
        alignItems: 'center',
    },
    stepperValue: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: COLORS.text.primary,
    },
    stepperLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    dateText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    breakdownCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F5F0E8',
        marginBottom: 24,
    },
    breakdownTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
        marginBottom: 16,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    breakdownLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#9A8070',
    },
    breakdownValue: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 14,
        color: COLORS.text.primary,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    totalLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
    },
    totalValue: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.accent.primary,
    },
    depositNotice: {
        flexDirection: 'row',
        backgroundColor: 'rgba(90, 122, 74, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
        gap: 10,
    },
    depositText: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#5A7A4A',
        lineHeight: 18,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
    },
    confirmBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
    disabledBtn: {
        opacity: 0.6,
    },
    footerNote: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
        textAlign: 'center',
        marginTop: 12,
    }
});
