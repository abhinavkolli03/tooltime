import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
    Dimensions, Alert, Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { getDistanceKm } from '@/services/geo';
import { COLORS } from '@/constants/theme';
import { UserProfile } from '@/types/user.types';
import { Tool } from '@/types/tool.types';
import { Booking, BookingStatus } from '@/types/booking.types';
import { confirmHandover } from '@/services/cloudFunctions';
import { findOrCreateDirectThread } from '@/services/messageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: string }> = {
    pending:   { label: 'PENDING',    color: '#D98634', dot: '#FFE4B8', icon: 'time-outline' },
    accepted:  { label: 'PREPARING',  color: '#5A7A4A', dot: '#A2D68F', icon: 'cube-outline' },
    en_route:  { label: 'EN ROUTE',   color: '#C4622A', dot: '#FFD6B8', icon: 'navigate-outline' },
    delivered: { label: 'DELIVERED',   color: '#2A6CB4', dot: '#93C5FD', icon: 'checkmark-circle-outline' },
    active:    { label: 'ACTIVE',      color: '#7C5AC7', dot: '#D4B8FF', icon: 'construct-outline' },
};

const TIMELINE_STEPS: { key: BookingStatus; label: string; icon: string; isMCI?: boolean }[] = [
    { key: 'pending',   label: 'REQUESTED',  icon: 'time-outline' },
    { key: 'accepted',  label: 'CONFIRMED',  icon: 'checkmark' },
    { key: 'en_route',  label: 'EN ROUTE',   icon: 'truck-delivery', isMCI: true },
    { key: 'delivered', label: 'ARRIVED',     icon: 'location-outline' },
    { key: 'active',    label: 'RENTING',     icon: 'construct-outline' },
];

const STATUS_ORDER: BookingStatus[] = ['pending', 'accepted', 'en_route', 'delivered', 'active'];

export default function BorrowerTrackingModal() {
    const insets = useSafeAreaInsets();
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [lender, setLender] = useState<UserProfile | null>(null);
    const [tool, setTool] = useState<Tool | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');

    const [lenderLoc, setLenderLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        if (!bookingId) return;
        const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
            if (!snap.exists()) return;
            const data = { id: snap.id, ...snap.data() } as Booking;
            setBooking(data);
            if (data.lenderLat && data.lenderLng) {
                setLenderLoc({ lat: data.lenderLat, lng: data.lenderLng });
                if (data.borrowerLat && data.borrowerLng) {
                    const dist = getDistanceKm(data.lenderLat, data.lenderLng, data.borrowerLat, data.borrowerLng);
                    setEtaMinutes(Math.max(1, Math.ceil((dist / 25) * 60)));
                }
            }
        });
        return () => unsubscribe();
    }, [bookingId]);

    useEffect(() => {
        if (!booking) return;
        let cancelled = false;
        (async () => {
            try {
                const [lDoc, tDoc] = await Promise.all([
                    getDoc(doc(db, 'users', booking.lenderId)),
                    getDoc(doc(db, 'tools', booking.toolId)),
                ]);
                if (cancelled) return;
                if (lDoc.exists()) setLender(lDoc.data() as UserProfile);
                if (tDoc.exists()) setTool({ id: tDoc.id, ...tDoc.data() } as Tool);
            } catch (e) {
                console.error('Error fetching tracking details:', e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [booking?.lenderId, booking?.toolId]);

    useEffect(() => {
        if (!lenderLoc || !booking?.borrowerLat || !mapRef.current) return;
        mapRef.current.fitToCoordinates(
            [
                { latitude: lenderLoc.lat, longitude: lenderLoc.lng },
                { latitude: booking.borrowerLat, longitude: booking.borrowerLng },
            ],
            { edgePadding: { top: 180, right: 80, bottom: 400, left: 80 }, animated: true }
        );
    }, [lenderLoc]);

    const distanceMiles = useMemo(() => {
        if (!lenderLoc || !booking?.borrowerLat) return null;
        const km = getDistanceKm(lenderLoc.lat, lenderLoc.lng, booking.borrowerLat, booking.borrowerLng);
        return (km * 0.621371).toFixed(1);
    }, [lenderLoc, booking?.borrowerLat, booking?.borrowerLng]);

    const currentStepIdx = useMemo(() => {
        if (!booking) return 0;
        return Math.max(0, STATUS_ORDER.indexOf(booking.status as BookingStatus));
    }, [booking?.status]);

    const handleConfirmHandover = async () => {
        if (!bookingId || !booking) return;
        setIsConfirming(true);
        try {
            const result = await confirmHandover({ bookingId, confirmationCode: booking.confirmationCode });
            if (!result.success) throw new Error(result.error);
            Alert.alert('Rental Started!', 'Enjoy using the tool. Take good care of it!', [{ text: 'OK' }]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not confirm handover');
        }
        setIsConfirming(false);
    };

    const handleCancelBooking = () => {
        if (!bookingId) return;
        Alert.alert('Cancel Request', 'Are you sure you want to cancel this tool request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                    try {
                        await updateDoc(doc(db, 'bookings', bookingId), {
                            status: 'cancelled',
                            updatedAt: serverTimestamp(),
                        });
                        router.back();
                    } catch (e) {
                        Alert.alert('Error', 'Could not cancel booking');
                    }
                },
            },
        ]);
    };

    const handleOpenChat = async () => {
        if (!booking || !tool) return;
        try {
            const { threadId } = await findOrCreateDirectThread({
                otherUserId: booking.lenderId,
                toolId: booking.toolId,
                toolName: tool.name,
                role: 'borrower',
            });
            router.push({
                pathname: '/modals/chat',
                params: {
                    threadId,
                    otherName: lender?.displayName || 'Lender',
                    otherAvatar: lender?.avatarUrl || '',
                    toolName: tool.name,
                },
            });
        } catch {
            router.push('/(borrower)/messages' as any);
        }
    };

    const handleInitiateReturn = async () => {
        if (!bookingId) return;
        Alert.alert(
            'Initiate Return',
            'Ready to return the tool? The lender will be notified to arrange pickup.',
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Yes, Return', onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'bookings', bookingId), {
                                status: 'returning',
                                updatedAt: serverTimestamp(),
                            });
                        } catch {
                            Alert.alert('Error', 'Could not initiate return');
                        }
                    },
                },
            ]
        );
    };

    if (!bookingId) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#EDE4D4" />
                <Text style={styles.errorText}>No booking selected</Text>
                <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
                    <Text style={styles.goBackBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading || !booking) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        );
    }

    const lenderFirst = lender?.displayName?.split(' ')[0] || 'Lender';
    const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    const borrowerCoord = { latitude: booking.borrowerLat, longitude: booking.borrowerLng };
    const lenderCoord = lenderLoc ? { latitude: lenderLoc.lat, longitude: lenderLoc.lng } : null;

    const renderPendingStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="time-outline" size={24} color="#D98634" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Waiting for Response</Text>
                    <Text style={styles.actionSub}>
                        {lenderFirst} hasn't responded yet. You'll be notified when they do.
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemMeta}>
                        {tool?.category?.replace('_', ' ')} · {booking.durationHours}h
                    </Text>
                    <Text style={styles.itemDuration}>
                        Total: ${((booking.totalCharged || 0) / 100).toFixed(2)}
                    </Text>
                </View>
            </View>

            <View style={styles.waitingIndicator}>
                <View style={styles.pulseRow}>
                    <View style={[styles.pulseDot, { backgroundColor: '#D98634' }]} />
                    <View style={[styles.pulseDot, { backgroundColor: '#D98634', opacity: 0.6 }]} />
                    <View style={[styles.pulseDot, { backgroundColor: '#D98634', opacity: 0.3 }]} />
                </View>
                <Text style={styles.waitingText}>Waiting for {lenderFirst} to accept...</Text>
            </View>

            <TouchableOpacity style={styles.cancelOutlineBtn} onPress={handleCancelBooking}>
                <Ionicons name="close-circle-outline" size={18} color="#B84040" />
                <Text style={styles.cancelOutlineBtnText}>Cancel Request</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPreparingStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#EBF5E5' }]}>
                    <Ionicons name="cube-outline" size={24} color="#5A7A4A" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>{lenderFirst} is Preparing</Text>
                    <Text style={styles.actionSub}>
                        Your tool is being prepared. They'll head your way soon!
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemMeta}>
                        {tool?.category?.replace('_', ' ')} · {tool?.condition}
                    </Text>
                    <Text style={styles.itemDuration}>
                        {booking.durationHours}h rental · ${((booking.rentalFee || 0) / 100).toFixed(2)}
                    </Text>
                </View>
            </View>

            {tool?.specs && tool.specs.length > 0 && (
                <View style={styles.specsList}>
                    <Text style={styles.specsLabel}>WHAT YOU'RE GETTING</Text>
                    {tool.specs.map((spec, i) => (
                        <View key={i} style={styles.specRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#5A7A4A" />
                            <Text style={styles.specText}>{spec}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={20} color="#D98634" />
                <Text style={styles.tipText}>
                    Make sure you're available at your location for the delivery.
                </Text>
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.accent.primary} />
                <Text style={styles.secondaryBtnText}>Message {lenderFirst}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEnRouteStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#FFF0E4' }]}>
                    <MaterialCommunityIcons name="truck-delivery" size={24} color={COLORS.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>{lenderFirst} is On The Way!</Text>
                    <Text style={styles.actionSub}>
                        {distanceMiles ? `${distanceMiles} mi away` : 'Calculating...'}
                        {etaMinutes ? ` · ~${etaMinutes} min ETA` : ''}
                    </Text>
                </View>
            </View>

            <View style={styles.lenderCard}>
                <Image
                    source={{ uri: lender?.avatarUrl || 'https://i.pravatar.cc/150' }}
                    style={styles.lenderAvatar}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.lenderName}>{lender?.displayName || 'Lender'}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>
                            {lender?.lenderRating?.toFixed(1) || '4.9'}
                        </Text>
                    </View>
                </View>
                <View style={styles.lenderActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleOpenChat}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1C1410" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: COLORS.accent.primary }]}
                        onPress={() => Linking.openURL(`tel:${lender?.phoneNumber || ''}`)}
                    >
                        <Ionicons name="call" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemDuration}>{booking.durationHours}h rental</Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: '#FFF0E4' }]}>
                    <Text style={[styles.miniStatusText, { color: COLORS.accent.primary }]}>EN ROUTE</Text>
                </View>
            </View>
        </View>
    );

    const renderDeliveredStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.successBanner}>
                <Ionicons name="location" size={28} color="#2A6CB4" />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.successTitle, { color: '#2A6CB4' }]}>Tool Has Arrived!</Text>
                    <Text style={styles.successSub}>
                        {lenderFirst} dropped off your {tool?.name}. Confirm you've received it.
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemDuration}>
                        {booking.durationHours}h rental · Code: {booking.confirmationCode}
                    </Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: '#E0EDFF' }]}>
                    <Text style={[styles.miniStatusText, { color: '#2A6CB4' }]}>ARRIVED</Text>
                </View>
            </View>

            <View style={styles.handoverNotice}>
                <Ionicons name="shield-checkmark" size={22} color="#5A7A4A" />
                <View style={{ flex: 1 }}>
                    <Text style={styles.handoverTitle}>Ready to start your rental?</Text>
                    <Text style={styles.handoverDesc}>
                        Inspect the tool and confirm handover to begin your rental period.
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.primaryBtn, isConfirming && styles.primaryBtnDisabled]}
                onPress={handleConfirmHandover}
                disabled={isConfirming}
            >
                {isConfirming ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Confirm Handover</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.accent.primary} />
                <Text style={styles.secondaryBtnText}>Message {lenderFirst}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderActiveStep = () => (
        <View style={styles.actionSection}>
            <View style={[styles.successBanner, { backgroundColor: '#F3EEFF', borderColor: '#D4B8FF' }]}>
                <Ionicons name="construct" size={28} color="#7C5AC7" />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.successTitle, { color: '#7C5AC7' }]}>Rental Active</Text>
                    <Text style={styles.successSub}>
                        Enjoy using {tool?.name}! Take good care of it.
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemDuration}>
                        {booking.durationHours}h rental · ${((booking.totalCharged || 0) / 100).toFixed(2)} total
                    </Text>
                </View>
            </View>

            <View style={styles.rentalInfo}>
                <View style={styles.rentalStat}>
                    <Text style={styles.rentalStatLabel}>DURATION</Text>
                    <Text style={styles.rentalStatValue}>{booking.durationHours}h</Text>
                </View>
                <View style={styles.rentalStatDivider} />
                <View style={styles.rentalStat}>
                    <Text style={styles.rentalStatLabel}>DEPOSIT</Text>
                    <Text style={styles.rentalStatValue}>${((booking.depositAmount || 0) / 100).toFixed(0)}</Text>
                </View>
                <View style={styles.rentalStatDivider} />
                <View style={styles.rentalStat}>
                    <Text style={styles.rentalStatLabel}>STATUS</Text>
                    <Text style={[styles.rentalStatValue, { color: '#5A7A4A' }]}>In Use</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.returnBtn} onPress={handleInitiateReturn}>
                <Ionicons name="arrow-undo-outline" size={18} color={COLORS.accent.primary} />
                <Text style={styles.returnBtnText}>Initiate Return</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.accent.primary} />
                <Text style={styles.secondaryBtnText}>Message {lenderFirst}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderCurrentStep = () => {
        switch (booking.status) {
            case 'pending': return renderPendingStep();
            case 'accepted': return renderPreparingStep();
            case 'en_route': return renderEnRouteStep();
            case 'delivered': return renderDeliveredStep();
            case 'active': return renderActiveStep();
            default: return renderPendingStep();
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Banner */}
            <View style={[styles.topBanner, { paddingTop: insets.top + 10, backgroundColor: cfg.color }]}>
                <View style={styles.bannerRow}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.bannerCenter}>
                        <View style={[styles.bannerDot, { backgroundColor: cfg.dot }]} />
                        <View>
                            <Text style={styles.bannerTitle}>
                                {cfg.label} — {tool?.name || 'Tool'}
                            </Text>
                            <Text style={styles.bannerSub}>
                                {booking.status === 'pending' ? `Waiting for ${lenderFirst}` :
                                 booking.status === 'en_route' ? `${lenderFirst} is heading to you` :
                                 booking.status === 'delivered' ? 'Confirm to start rental' :
                                 booking.status === 'active' ? 'Rental in progress' :
                                 `${lenderFirst} is preparing`}
                            </Text>
                        </View>
                    </View>
                    {etaMinutes != null && booking.status === 'en_route' ? (
                        <Text style={styles.etaText}>~{etaMinutes}m</Text>
                    ) : <View style={{ width: 40 }} />}
                </View>
            </View>

            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: booking.borrowerLat,
                    longitude: booking.borrowerLng,
                    latitudeDelta: 0.03,
                    longitudeDelta: 0.03,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
            >
                <Marker coordinate={borrowerCoord}>
                    <View style={styles.destMarker}>
                        <View style={styles.destIconContainer}>
                            <Ionicons name="home" size={14} color="#FFFFFF" />
                        </View>
                        <Text style={styles.markerLabel}>Your Place</Text>
                    </View>
                </Marker>
                {lenderCoord && (
                    <Marker coordinate={lenderCoord}>
                        <View style={styles.vehicleMarker}>
                            <MaterialCommunityIcons name="truck-delivery" size={22} color="#FFFFFF" />
                        </View>
                    </Marker>
                )}
                {lenderCoord && (
                    <Polyline
                        coordinates={[lenderCoord, borrowerCoord]}
                        strokeColor={COLORS.accent.primary}
                        strokeWidth={4}
                        lineDashPattern={[6, 10]}
                    />
                )}
            </MapView>

            {distanceMiles && booking.status === 'en_route' && (
                <View style={[styles.distanceBadge, { top: insets.top + 140 }]}>
                    <MaterialCommunityIcons name="navigation-variant" size={16} color={COLORS.accent.primary} style={{ transform: [{ rotate: '45deg' }] }} />
                    <Text style={styles.distanceText}>{distanceMiles} mi away</Text>
                </View>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={booking.status === 'delivered' ? [400, 600] : [360, 560]}
                handleIndicatorStyle={{ backgroundColor: '#EDE4D4', width: 40 }}
                backgroundStyle={{ borderRadius: 32, backgroundColor: '#FFFFFF' }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    {/* Timeline */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineLine} />
                        <View style={styles.timelineSteps}>
                            {TIMELINE_STEPS.map((step, idx) => {
                                const isCompleted = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                return (
                                    <View key={step.key} style={styles.stepWrapper}>
                                        <View style={[
                                            styles.stepCircle,
                                            isCompleted && styles.stepCircleCompleted,
                                            isActive && styles.stepCircleActive,
                                        ]}>
                                            {step.isMCI ? (
                                                <MaterialCommunityIcons
                                                    name={step.icon as any}
                                                    size={12}
                                                    color={isActive || isCompleted ? '#FFFFFF' : '#BDC3C7'}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name={step.icon as any}
                                                    size={12}
                                                    color={isActive || isCompleted ? '#FFFFFF' : '#BDC3C7'}
                                                />
                                            )}
                                        </View>
                                        <Text style={[styles.stepLabel, (isActive || isCompleted) && styles.stepLabelActive]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Status-specific content */}
                    {renderCurrentStep()}
                </BottomSheetScrollView>
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0E8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
    errorText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#9A8070', marginTop: 12 },
    goBackBtn: {
        marginTop: 16, backgroundColor: COLORS.accent.primary,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    },
    goBackBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#FFFFFF' },

    // Banner
    topBanner: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: 18,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 10,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bannerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
    bannerDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    bannerTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#FFFFFF' },
    bannerSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    etaText: { fontFamily: 'DMSans-Medium', fontSize: 18, color: '#FFFFFF' },

    // Map
    map: { flex: 1 },
    destMarker: { alignItems: 'center' },
    destIconContainer: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: '#BC9F77',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
    },
    markerLabel: {
        fontFamily: 'DMSans-Medium', fontSize: 9, color: '#1C1410', marginTop: 3,
        backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 4, borderRadius: 3,
    },
    vehicleMarker: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent.primary,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    distanceBadge: {
        position: 'absolute', left: '50%', marginLeft: -60, width: 120, height: 36,
        backgroundColor: '#FFFFFF', borderRadius: 18, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 5,
    },
    distanceText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#1C1410' },

    // Sheet
    sheetContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

    // Timeline
    timelineContainer: { position: 'relative', height: 70, marginBottom: 8 },
    timelineLine: { position: 'absolute', top: 13, left: 24, right: 24, height: 2, backgroundColor: '#F0F0F0' },
    timelineSteps: { flexDirection: 'row', justifyContent: 'space-between' },
    stepWrapper: { alignItems: 'center', width: 60 },
    stepCircle: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0',
        alignItems: 'center', justifyContent: 'center', zIndex: 2,
    },
    stepCircleActive: {
        backgroundColor: COLORS.accent.primary, borderWidth: 3,
        borderColor: 'rgba(196, 98, 42, 0.15)', width: 32, height: 32, borderRadius: 16, marginTop: -2,
    },
    stepCircleCompleted: { backgroundColor: COLORS.accent.primary },
    stepLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: '#BDC3C7', marginTop: 6 },
    stepLabelActive: { color: '#1C1410' },

    // Action sections
    actionSection: { gap: 16 },
    actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    actionIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontFamily: 'DMSans-Medium', fontSize: 17, color: COLORS.text.primary },
    actionSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2, lineHeight: 18 },

    // Item card
    itemCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA',
        borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F5F0E8',
    },
    itemImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F5F0E8' },
    itemDetails: { flex: 1, marginLeft: 14 },
    itemName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    itemMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 2 },
    itemDuration: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.accent.primary, marginTop: 4 },

    // Specs
    specsList: { gap: 8 },
    specsLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: '#9A8070', letterSpacing: 0.5, marginBottom: 4 },
    specRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    specText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: COLORS.text.primary },

    // Buttons
    primaryBtn: {
        height: 52, borderRadius: 14, backgroundColor: '#5A7A4A',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#FFFFFF' },
    secondaryBtn: {
        height: 48, borderRadius: 14, backgroundColor: '#FFF9F2',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: '#FACB9B',
    },
    secondaryBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.accent.primary },
    cancelOutlineBtn: {
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8C8C8',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    cancelOutlineBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#B84040' },

    // Return
    returnBtn: {
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent.primary,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    returnBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.accent.primary },

    // Waiting indicator
    waitingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    pulseRow: { flexDirection: 'row', gap: 4 },
    pulseDot: { width: 8, height: 8, borderRadius: 4 },
    waitingText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070' },

    // Tip card
    tipCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FFF9F2', padding: 14, borderRadius: 12,
        borderWidth: 1, borderColor: '#FACB9B',
    },
    tipText: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', lineHeight: 18 },

    // Lender card
    lenderCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#F5F0E8',
    },
    lenderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F0E8' },
    lenderName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    ratingText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070' },
    lenderActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F0E8',
        alignItems: 'center', justifyContent: 'center',
    },

    // Status badge
    miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, fontWeight: '700' },

    // Success banner
    successBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#EBF3FF', padding: 16, borderRadius: 14,
        borderWidth: 1, borderColor: '#93C5FD',
    },
    successTitle: { fontFamily: 'DMSans-Medium', fontSize: 17, color: '#5A7A4A' },
    successSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070', marginTop: 2 },

    // Handover
    handoverNotice: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: '#EBF5E5', padding: 14, borderRadius: 12,
        borderWidth: 1, borderColor: '#C8E6B8',
    },
    handoverTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#5A7A4A' },
    handoverDesc: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070', marginTop: 3, lineHeight: 17 },

    // Rental info
    rentalInfo: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        backgroundColor: '#FAFAFA', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#F5F0E8',
    },
    rentalStat: { alignItems: 'center' },
    rentalStatLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#9A8070', letterSpacing: 0.3 },
    rentalStatValue: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 20, color: COLORS.text.primary, marginTop: 4 },
    rentalStatDivider: { width: 1, height: 30, backgroundColor: '#F5F0E8' },
});
