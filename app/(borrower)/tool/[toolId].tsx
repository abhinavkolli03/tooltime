import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { Image } from 'expo-image';

import { db } from '@/services/firebase';
import { COLORS } from '@/constants/theme';
import { Tool } from '@/types/tool.types';
import { UserProfile } from '@/types/user.types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { createBooking } from '@/services/cloudFunctions';
import { useAuthStore } from '@/store/authStore';
import { getOrCreateThread } from '@/services/messageService';

const { width, height } = Dimensions.get('window');

const DURATION_PRESETS = [
    { label: '2 hrs', value: 2 },
    { label: '4 hrs', value: 4 },
    { label: '8 hrs', value: 8 },
    { label: '1 day', value: 24 },
];

const MarketPriceComparison = ({ tool, durationHours }: { tool: Tool, durationHours: number }) => {
    const retailPrice = (tool.marketRetailPrice ?? 0) / 100;
    if (retailPrice <= 0) return null;

    const rentalFee = (durationHours * (tool.hourlyRate ?? 0)) / 100;
    const deliveryFee = (tool.deliveryFee || 800) / 100;
    const totalRental = rentalFee + deliveryFee;
    const savings = retailPrice - totalRental;
    const savingsPercent = Math.round((savings / retailPrice) * 100);

    return (
        <View style={styles.comparisonCard}>
            <Text style={styles.comparisonHeader}>💡 RENTING VS. BUYING</Text>

            <View style={styles.comparisonRow}>
                {/* Rent Column */}
                <View style={styles.comparisonCol}>
                    <View style={[styles.colorBlock, { backgroundColor: '#C4622A' }]} />
                    <Text style={styles.comparisonValue}>${totalRental.toFixed(2)}</Text>
                    <Text style={styles.comparisonSubValue}>{durationHours} hrs rental</Text>
                    <Text style={styles.comparisonLabel}>Pay only for what you need</Text>
                </View>

                {/* VS Divider */}
                <View style={styles.vsDivider}>
                    <View style={styles.vsLine} />
                    <Text style={styles.vsText}>vs</Text>
                    <View style={styles.vsLine} />
                </View>

                {/* Buy Column */}
                <View style={styles.comparisonCol}>
                    <View style={[styles.colorBlock, { backgroundColor: '#9A8070' }]} />
                    <Text style={[styles.comparisonValue, styles.buyValue]}>${retailPrice.toFixed(2)}</Text>
                    <Text style={styles.comparisonSubValue}>Retail price</Text>
                    <Text style={styles.comparisonLabel}>Then store it forever</Text>
                </View>
            </View>

            <View style={styles.savingsCallout}>
                <Ionicons name="checkmark-circle" size={16} color="#5A7A4A" />
                <Text style={styles.savingsText}>Save {savingsPercent}% — that's ${savings.toFixed(2)} back in your pocket</Text>
            </View>
        </View>
    );
};

export default function ToolDetailsScreen() {
    const { toolId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const [tool, setTool] = useState<Tool | null>(null);
    const [lender, setLender] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Booking Flow State
    const [durationHours, setDurationHours] = useState(4);
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const bookingSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!toolId) return;
            try {
                const toolDoc = await getDoc(doc(db, 'tools', toolId as string));
                if (toolDoc.exists()) {
                    const toolData = { id: toolDoc.id, ...toolDoc.data() } as Tool;
                    setTool(toolData);

                    const lenderDoc = await getDoc(doc(db, 'users', toolData.lenderId));
                    if (lenderDoc.exists()) {
                        setLender(lenderDoc.data() as UserProfile);
                    }
                }
            } catch (error) {
                console.error('Error fetching tool details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [toolId]);

    const handleBookNow = useCallback(() => {
        if (!tool) return;
        router.push({
            pathname: '/modals/booking',
            params: {
                toolId: tool.id,
                toolData: JSON.stringify(tool)
            }
        });
    }, [tool, router]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
            />
        ),
        []
    );

    const costBreakdown = useMemo(() => {
        if (!tool) return null;
        const rentalFee = (durationHours * (tool.hourlyRate ?? 0)) / 100;
        const deliveryFee = (tool.deliveryFee || 800) / 100;
        const platformFee = rentalFee * 0.1;
        const total = rentalFee + deliveryFee + platformFee;
        return { rentalFee, deliveryFee, platformFee, total };
    }, [tool, durationHours]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    if (!tool) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Tool not found</Text>
                <Button label="Go Back" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
                {/* Hero Area */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: tool.photoUrls?.[0] || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop' }}
                        style={styles.toolImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.25)']}
                        style={styles.imageGradient}
                    />

                    {/* Header Controls */}
                    <SafeAreaView style={styles.headerControls} edges={['top']}>
                        <TouchableOpacity style={styles.circularBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={styles.circularBtn} onPress={() => Alert.alert('Coming Soon', 'Sharing is under development.')}>
                                <Ionicons name="share-outline" size={24} color={COLORS.text.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.circularBtn} onPress={() => Alert.alert('Coming Soon', 'Favorites are under development.')}>
                                <Ionicons name="heart-outline" size={24} color={COLORS.text.primary} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    {/* Condition Badge Overlaid */}
                    <View style={styles.overlayBadgeContainer}>
                        <Text style={styles.overlayBadgeText}>
                            {(tool.condition || 'good').toUpperCase()} CONDITION
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.mainInfo}>
                        <View style={styles.categoryRow}>
                            <Text style={styles.categoryText}>{(tool.category || 'tools').replace('_', ' ').toUpperCase()}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={16} color="#F5A623" />
                                <Text style={styles.ratingText}>{(tool.rating ?? 0).toFixed(1)} <Text style={styles.reviewCount}>({tool.rentalCount ?? 0} reviews)</Text></Text>
                            </View>
                        </View>
                        <Text style={styles.toolName}>{tool.name}</Text>
                    </View>

                    {/* Pricing Card */}
                    <View style={styles.pricingCard}>
                        <View style={styles.priceHighlightRow}>
                            <Text style={styles.priceAccent}>${((tool.hourlyRate ?? 0) / 100).toFixed(2)}<Text style={styles.priceUnit}> / hr</Text></Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.accent.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailTitle}>Security Deposit</Text>
                                <Text style={styles.detailSub}>${((tool.depositAmount ?? 0) / 100).toFixed(2)} (Held, fully refundable)</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Ionicons name="car-outline" size={20} color={COLORS.accent.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailTitle}>Flat Rate Delivery</Text>
                                <Text style={styles.detailSub}>${((tool.deliveryFee || 800) / 100).toFixed(2)} within 2 miles</Text>
                            </View>
                        </View>
                    </View>

                    {/* Market Comparison Card */}
                    <MarketPriceComparison tool={tool} durationHours={durationHours} />

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About this tool</Text>
                        <Text style={styles.descriptionText}>{tool.description || "No description available."}</Text>

                        {tool.specs && tool.specs.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.specsScroll}
                                contentContainerStyle={styles.specsContainer}
                            >
                                {tool.specs.map((spec: string, index: number) => (
                                    <View key={index} style={styles.specChip}>
                                        <Text style={styles.specText}>{spec}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Lender Profile */}
                    {lender && (
                        <View style={styles.lenderCard}>
                            <View style={styles.lenderHeader}>
                                <Image
                                    source={{ uri: lender.avatarUrl || 'https://via.placeholder.com/150' }}
                                    style={styles.lenderAvatar}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.lenderName}>{lender.displayName}</Text>
                                    <View style={styles.lenderStats}>
                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.semantic.success} />
                                        <Text style={styles.lenderStatsText}>Verified Lender • {lender.lenderRating} ⭐</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.followBtn} onPress={() => Alert.alert('Coming Soon', 'Following lenders is under development.')}>
                                    <Text style={styles.followBtnText}>Follow</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.messageBtn} onPress={async () => {
                                if (!tool || !lender || !user) return;
                                try {
                                    const threadId = await getOrCreateThread({
                                        otherUserId: tool.lenderId,
                                        toolId: tool.id,
                                        bookingId: '',
                                    });
                                    router.push({
                                        pathname: '/modals/chat',
                                        params: {
                                            threadId,
                                            otherName: lender.displayName,
                                            otherAvatar: lender.avatarUrl || '',
                                            toolName: tool.name,
                                        },
                                    });
                                } catch (e) {
                                    Alert.alert('Error', 'Could not open chat. Please try again.');
                                }
                            }}>
                                <Ionicons name="chatbubble-outline" size={20} color={COLORS.text.primary} />
                                <Text style={styles.messageBtnText}>Message {lender.displayName.split(' ')[0]}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View>
                    <Text style={styles.totalLabel}>EST. TOTAL</Text>
                    <Text style={styles.totalPrice}>${costBreakdown?.total.toFixed(2)} <Text style={styles.totalUnit}>/ {durationHours} hrs</Text></Text>
                </View>
                <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow}>
                    <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
        marginBottom: 20,
    },
    imageContainer: {
        width: '100%',
        height: 280,
        backgroundColor: '#EDE4D4',
        position: 'relative',
    },
    toolImage: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    headerControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    circularBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    overlayBadgeContainer: {
        position: 'absolute',
        bottom: 12,
        left: 16,
    },
    overlayBadgeText: {
        backgroundColor: 'rgba(90, 122, 74, 0.9)',
        color: 'white',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        fontFamily: 'DMSans-Medium',
        fontSize: 11,
        letterSpacing: 1,
    },
    contentContainer: {
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    mainInfo: {
        marginBottom: 24,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: COLORS.accent.primary,
        letterSpacing: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
    },
    reviewCount: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    toolName: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: COLORS.text.primary,
        lineHeight: 38,
    },
    pricingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EFE9DE',
        marginBottom: 24,
    },
    priceHighlightRow: {
        marginBottom: 16,
    },
    priceAccent: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 36,
        color: COLORS.accent.primary,
    },
    priceUnit: {
        fontSize: 16,
        fontFamily: 'DMSans-Regular',
        color: '#9A8070',
    },
    divider: {
        height: 1,
        backgroundColor: '#EFE9DE',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    detailSub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
    },
    comparisonCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EFE9DE',
        marginBottom: 32,
    },
    comparisonHeader: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: '#9A8070',
        letterSpacing: 1,
        marginBottom: 16,
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    comparisonCol: {
        flex: 1,
    },
    colorBlock: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        marginBottom: 12,
    },
    comparisonValue: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 18,
        color: '#C4622A',
        marginBottom: 2,
    },
    buyValue: {
        color: '#9A8070',
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    comparisonSubValue: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: '#9A8070',
        marginBottom: 4,
    },
    comparisonLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    vsDivider: {
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsLine: {
        width: 1,
        height: 20,
        backgroundColor: '#EFE9DE',
    },
    vsText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: '#EFE9DE',
        marginVertical: 4,
    },
    savingsCallout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F0F7EE',
        padding: 10,
        borderRadius: 8,
    },
    savingsText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: '#5A7A4A',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    descriptionText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: '#6B4226',
        lineHeight: 25,
    },
    specsScroll: {
        marginTop: 16,
    },
    specsContainer: {
        gap: 8,
    },
    specChip: {
        backgroundColor: '#EDE4D4',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    specText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: '#6B4226',
    },
    lenderCard: {
        backgroundColor: '#F5F0E8',
        borderRadius: 24,
        padding: 20,
    },
    lenderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    lenderAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
    },
    lenderName: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    lenderStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    lenderStatsText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    followBtn: {
        backgroundColor: 'rgba(196, 98, 42, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    followBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.accent.primary,
    },
    messageBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#EFE9DE',
    },
    messageBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#EFE9DE',
    },
    totalLabel: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
        color: '#9A8070',
        letterSpacing: 1,
    },
    totalPrice: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 24,
        color: COLORS.text.primary,
    },
    totalUnit: {
        fontSize: 14,
        fontFamily: 'DMSans-Regular',
        color: '#9A8070',
    },
    bookBtn: {
        backgroundColor: COLORS.accent.primary,
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 20,
    },
    bookBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
    modalContent: {
        padding: 24,
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 20,
        color: COLORS.text.primary,
    },
    pickerLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    presetChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EFE9DE',
        alignItems: 'center',
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
        gap: 24,
        marginBottom: 24,
    },
    stepperBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValue: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    breakdownCard: {
        backgroundColor: '#F5F0E8',
        borderRadius: 16,
        padding: 16,
        gap: 10,
        marginBottom: 24,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownLabel: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#6B4226',
    },
    breakdownValue: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 14,
        color: '#6B4226',
    },
    breakdownTotalRow: {
        marginTop: 4,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(107, 66, 38, 0.1)',
    },
    breakdownTotalLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
    },
    breakdownTotalValue: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 16,
        color: COLORS.accent.primary,
    },
    depositNote: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
        fontStyle: 'italic',
    },
    errorInline: {
        color: '#B84040',
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 12,
    },
    sendBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    sendBtnDisabled: {
        opacity: 0.6,
    },
    sendBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    }
});
