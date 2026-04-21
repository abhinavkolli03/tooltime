import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView,
    ActivityIndicator, Dimensions, Alert, Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { db, storage } from '@/services/firebase';
import { getDistanceKm } from '@/services/geo';
import { COLORS } from '@/constants/theme';
import { UserProfile } from '@/types/user.types';
import { Tool } from '@/types/tool.types';
import { Booking, BookingStatus } from '@/types/booking.types';
import { startEnRoute, confirmDelivery } from '@/services/cloudFunctions';
import { findOrCreateDirectThread } from '@/services/messageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: string }> = {
    accepted:  { label: 'PREPARING',   color: '#5A7A4A', dot: '#A2D68F', icon: 'cube-outline' },
    en_route:  { label: 'EN ROUTE',    color: '#C4622A', dot: '#FFD6B8', icon: 'navigate-outline' },
    delivered: { label: 'DELIVERED',    color: '#2A6CB4', dot: '#93C5FD', icon: 'checkmark-circle-outline' },
    active:    { label: 'RENTED OUT',   color: '#6B4226', dot: '#D4B896', icon: 'construct-outline' },
};

const TIMELINE_STEPS: { key: BookingStatus; label: string; icon: string; isMCI?: boolean }[] = [
    { key: 'accepted',  label: 'CONFIRMED', icon: 'checkmark' },
    { key: 'en_route',  label: 'EN ROUTE',  icon: 'truck-delivery', isMCI: true },
    { key: 'delivered', label: 'DELIVERED',  icon: 'camera-outline' },
    { key: 'active',    label: 'RENTED',     icon: 'construct-outline' },
];

const STATUS_ORDER: BookingStatus[] = ['accepted', 'en_route', 'delivered', 'active'];

export default function LenderDeliveryModal() {
    const insets = useSafeAreaInsets();
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [borrower, setBorrower] = useState<UserProfile | null>(null);
    const [tool, setTool] = useState<Tool | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdvancing, setIsAdvancing] = useState(false);

    const [dropoffPhoto, setDropoffPhoto] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const [lenderLoc, setLenderLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        if (!bookingId) return;
        const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), async (snap) => {
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
                const [bDoc, tDoc] = await Promise.all([
                    getDoc(doc(db, 'users', booking.borrowerId)),
                    getDoc(doc(db, 'tools', booking.toolId)),
                ]);
                if (cancelled) return;
                if (bDoc.exists()) setBorrower(bDoc.data() as UserProfile);
                if (tDoc.exists()) setTool({ id: tDoc.id, ...tDoc.data() } as Tool);
            } catch (e) {
                console.error('Error fetching delivery details:', e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [booking?.borrowerId, booking?.toolId]);

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

    const handleStartEnRoute = async () => {
        if (!bookingId) return;
        setIsAdvancing(true);
        try {
            const result = await startEnRoute({ bookingId });
            if (!result.success) throw new Error(result.error);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update status');
        }
        setIsAdvancing(false);
    };

    const takeDropoffPhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Camera access is required for delivery confirmation.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
            setDropoffPhoto(result.assets[0].uri);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!bookingId) return;
        setIsAdvancing(true);
        setIsUploadingPhoto(true);
        try {
            let photoUrl: string | undefined;
            if (dropoffPhoto) {
                const response = await fetch(dropoffPhoto);
                const blob = await response.blob();
                const filename = `dropoff_${Date.now()}.jpg`;
                const storageRef = ref(storage, `bookings/${bookingId}/dropoff/${filename}`);
                await uploadBytesResumable(storageRef, blob);
                photoUrl = await getDownloadURL(storageRef);
            }
            const result = await confirmDelivery({ bookingId, dropoffPhotoUrl: photoUrl });
            if (!result.success) throw new Error(result.error);
            Alert.alert(
                'Delivery Confirmed!',
                'The borrower has been notified. Waiting for them to confirm handover.',
                [{ text: 'OK' }]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not confirm delivery');
        }
        setIsUploadingPhoto(false);
        setIsAdvancing(false);
    };

    const handleOpenChat = async () => {
        if (!booking || !tool) return;
        try {
            const { threadId } = await findOrCreateDirectThread({
                otherUserId: booking.borrowerId,
                toolId: booking.toolId,
                toolName: tool.name,
                role: 'lender',
            });
            router.push({
                pathname: '/modals/chat',
                params: {
                    threadId,
                    otherName: borrower?.displayName || 'Borrower',
                    otherAvatar: borrower?.avatarUrl || '',
                    toolName: tool.name,
                },
            });
        } catch {
            router.push('/(lender)/messages' as any);
        }
    };

    const openMapsNavigation = () => {
        if (!booking) return;
        const lat = booking.borrowerLat;
        const lng = booking.borrowerLng;
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}`,
        });
        if (url) Linking.openURL(url);
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

    const borrowerFirst = borrower?.displayName?.split(' ')[0] || 'Borrower';
    const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.accepted;
    const borrowerCoord = { latitude: booking.borrowerLat, longitude: booking.borrowerLng };
    const lenderCoord = lenderLoc ? { latitude: lenderLoc.lat, longitude: lenderLoc.lng } : null;

    const renderPreparingStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#E8F5E2' }]}>
                    <Ionicons name="cube-outline" size={24} color="#5A7A4A" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Prepare for Delivery</Text>
                    <Text style={styles.actionSub}>Get the tool ready and head to {borrowerFirst}</Text>
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
                    <Text style={styles.specsLabel}>ITEMS TO BRING</Text>
                    {tool.specs.map((spec, i) => (
                        <View key={i} style={styles.specRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#5A7A4A" />
                            <Text style={styles.specText}>{spec}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.checklist}>
                <Text style={styles.specsLabel}>BEFORE YOU LEAVE</Text>
                {['Tool is clean and functional', 'All accessories included', 'Battery charged (if applicable)'].map((item, i) => (
                    <View key={i} style={styles.specRow}>
                        <Ionicons name="ellipse-outline" size={18} color={COLORS.text.muted} />
                        <Text style={styles.specText}>{item}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.primaryBtn, isAdvancing && styles.primaryBtnDisabled]}
                onPress={handleStartEnRoute}
                disabled={isAdvancing}
            >
                {isAdvancing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <MaterialCommunityIcons name="truck-delivery" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>I'm on my way</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderEnRouteStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#FFF0E4' }]}>
                    <Ionicons name="navigate" size={24} color={COLORS.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Heading to {borrowerFirst}</Text>
                    <Text style={styles.actionSub}>
                        {distanceMiles ? `${distanceMiles} mi away` : 'Calculating distance...'}
                        {etaMinutes ? ` · ~${etaMinutes} min` : ''}
                    </Text>
                </View>
            </View>

            <View style={styles.destinationCard}>
                <Ionicons name="location" size={22} color={COLORS.accent.primary} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.destName}>{borrowerFirst}'s Location</Text>
                    <Text style={styles.destAddr}>
                        {booking.borrowerLat.toFixed(4)}, {booking.borrowerLng.toFixed(4)}
                    </Text>
                </View>
                <TouchableOpacity style={styles.navBtn} onPress={openMapsNavigation}>
                    <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.navBtnText}>Navigate</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dropoffSection}>
                <Text style={styles.dropoffTitle}>Dropoff Confirmation Photo</Text>
                <Text style={styles.dropoffDesc}>
                    Take a photo of the tool at {borrowerFirst}'s front door, like Amazon delivery
                </Text>

                {dropoffPhoto ? (
                    <View style={styles.dropoffPreview}>
                        <Image source={{ uri: dropoffPhoto }} style={styles.dropoffImage} />
                        <View style={styles.dropoffOverlay}>
                            <TouchableOpacity style={styles.retakeBtn} onPress={takeDropoffPhoto}>
                                <Ionicons name="camera" size={18} color="#FFFFFF" />
                                <Text style={styles.retakeBtnText}>Retake</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.photoConfirmBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.photoConfirmText}>Photo ready</Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.cameraBox} onPress={takeDropoffPhoto}>
                        <Ionicons name="camera-outline" size={40} color={COLORS.text.muted} />
                        <Text style={styles.cameraText}>Tap to take delivery photo</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                style={[
                    styles.primaryBtn,
                    !dropoffPhoto && styles.primaryBtnWarn,
                    isAdvancing && styles.primaryBtnDisabled,
                ]}
                onPress={() => {
                    if (!dropoffPhoto) {
                        Alert.alert(
                            'No Photo',
                            'Take a delivery photo for proof of dropoff. Continue without?',
                            [
                                { text: 'Take Photo', onPress: takeDropoffPhoto },
                                { text: 'Skip', style: 'destructive', onPress: handleConfirmDelivery },
                            ]
                        );
                    } else {
                        handleConfirmDelivery();
                    }
                }}
                disabled={isAdvancing}
            >
                {isAdvancing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Confirm Delivery</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderDeliveredStep = () => (
        <View style={styles.actionSection}>
            <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={28} color="#5A7A4A" />
                <View style={{ flex: 1 }}>
                    <Text style={styles.successTitle}>Delivered!</Text>
                    <Text style={styles.successSub}>
                        Waiting for {borrowerFirst} to confirm handover
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemDuration}>
                        {booking.durationHours}h · ${((booking.rentalFee || 0) / 100).toFixed(2)} payout
                    </Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: '#E0EDFF' }]}>
                    <Text style={[styles.miniStatusText, { color: '#2A6CB4' }]}>DELIVERED</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.accent.primary} />
                <Text style={styles.secondaryBtnText}>Message {borrowerFirst}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderActiveStep = () => (
        <View style={styles.actionSection}>
            <View style={[styles.successBanner, { backgroundColor: '#FFF9F2', borderColor: '#FACB9B' }]}>
                <Ionicons name="construct" size={28} color={COLORS.accent.primary} />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.successTitle, { color: COLORS.accent.primary }]}>Rental Active</Text>
                    <Text style={styles.successSub}>
                        {borrowerFirst} is using your {tool?.name}
                    </Text>
                </View>
            </View>

            <View style={styles.itemCard}>
                <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{tool?.name || 'Tool'}</Text>
                    <Text style={styles.itemDuration}>
                        {booking.durationHours}h rental · Earning ${(((booking.rentalFee || 0) - (booking.platformFee || 0)) / 100).toFixed(2)}
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.accent.primary} />
                <Text style={styles.secondaryBtnText}>Message {borrowerFirst}</Text>
            </TouchableOpacity>
        </View>
    );

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
                                {booking.status === 'accepted' ? 'Get ready to deliver' : `To ${borrowerFirst}`}
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
                        <Text style={styles.markerLabel}>{borrowerFirst}'s Place</Text>
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
                    <Text style={styles.distanceText}>{distanceMiles} mi left</Text>
                </View>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={booking.status === 'accepted' ? [380, 600] : [360, 540]}
                handleIndicatorStyle={{ backgroundColor: '#EDE4D4', width: 40 }}
                backgroundStyle={{ borderRadius: 32, backgroundColor: '#FFFFFF' }}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    {/* Borrower Info */}
                    <View style={styles.personRow}>
                        <View style={styles.personLeft}>
                            <Image
                                source={{ uri: borrower?.avatarUrl || 'https://i.pravatar.cc/150' }}
                                style={styles.personAvatar}
                            />
                            <View>
                                <Text style={styles.personName}>{borrower?.displayName || 'Borrower'}</Text>
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={12} color="#FFD700" />
                                    <Text style={styles.ratingText}>
                                        {borrower?.borrowerRating?.toFixed(1) || '4.8'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.personActions}>
                            <TouchableOpacity style={styles.iconBtn} onPress={handleOpenChat}>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1C1410" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconBtn, { backgroundColor: COLORS.accent.primary }]}
                                onPress={() => { if (borrower?.phoneNumber) Linking.openURL(`tel:${borrower.phoneNumber}`); }}
                            >
                                <Ionicons name="call" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Timeline */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineLine} />
                        <View style={styles.timelineSteps}>
                            {TIMELINE_STEPS.map((step, i) => {
                                const isDone = i < currentStepIdx;
                                const isActive = i === currentStepIdx;
                                const color = isDone || isActive ? '#FFFFFF' : '#BDC3C7';
                                return (
                                    <View key={step.key} style={styles.stepWrapper}>
                                        <View style={[
                                            styles.stepCircle,
                                            isDone && styles.stepCircleDone,
                                            isActive && styles.stepCircleActive,
                                        ]}>
                                            {step.isMCI ? (
                                                <MaterialCommunityIcons name={step.icon as any} size={14} color={color} />
                                            ) : (
                                                <Ionicons name={step.icon as any} size={14} color={color} />
                                            )}
                                        </View>
                                        <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Status-specific content */}
                    {booking.status === 'accepted' && renderPreparingStep()}
                    {booking.status === 'en_route' && renderEnRouteStep()}
                    {booking.status === 'delivered' && renderDeliveredStep()}
                    {booking.status === 'active' && renderActiveStep()}
                </BottomSheetScrollView>
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0E8' },
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F5F0E8', paddingHorizontal: 40,
    },
    errorText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#9A8070', marginTop: 12, marginBottom: 20 },
    goBackBtn: { backgroundColor: COLORS.accent.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    goBackBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#FFFFFF' },

    topBanner: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: 20,
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32, zIndex: 10,
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bannerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 16 },
    bannerDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
    bannerTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#FFFFFF' },
    bannerSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 1 },
    etaText: { fontFamily: 'DMSans-Medium', fontSize: 18, color: '#FFFFFF' },

    map: { flex: 1 },
    destMarker: { alignItems: 'center' },
    destIconContainer: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A6CB4',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
    },
    markerLabel: {
        fontFamily: 'DMSans-Medium', fontSize: 10, color: '#1C1410', marginTop: 4,
        backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 5, borderRadius: 4,
    },
    vehicleMarker: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent.primary,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    distanceBadge: {
        position: 'absolute', alignSelf: 'center', paddingHorizontal: 16, height: 36,
        backgroundColor: '#FFFFFF', borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
        elevation: 4, zIndex: 5,
    },
    distanceText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#1C1410' },

    sheetContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

    personRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
    },
    personLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    personAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F0E8' },
    personName: { fontFamily: 'DMSans-Medium', fontSize: 17, color: COLORS.text.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    ratingText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#9A8070' },
    personActions: { flexDirection: 'row', gap: 10 },
    iconBtn: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F0E8',
        alignItems: 'center', justifyContent: 'center',
    },

    timelineContainer: { position: 'relative', height: 70, marginBottom: 20 },
    timelineLine: { position: 'absolute', top: 14, left: 30, right: 30, height: 2, backgroundColor: '#F0F0F0' },
    timelineSteps: { flexDirection: 'row', justifyContent: 'space-between' },
    stepWrapper: { alignItems: 'center', width: 70 },
    stepCircle: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F0F0',
        alignItems: 'center', justifyContent: 'center', zIndex: 2,
    },
    stepCircleActive: {
        backgroundColor: COLORS.accent.primary, borderWidth: 4,
        borderColor: 'rgba(196,98,42,0.12)', width: 34, height: 34, borderRadius: 17, marginTop: -2,
    },
    stepCircleDone: { backgroundColor: COLORS.accent.primary },
    stepLabel: { fontFamily: 'DMSans-Medium', fontSize: 9, color: '#BDC3C7', marginTop: 8 },
    stepLabelActive: { color: '#1C1410' },

    actionSection: { gap: 16 },
    actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    actionIconWrap: {
        width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    },
    actionTitle: { fontFamily: 'DMSans-Medium', fontSize: 18, color: COLORS.text.primary },
    actionSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: COLORS.text.muted, marginTop: 2 },

    itemCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA',
        borderRadius: 16, padding: 14, gap: 14, borderWidth: 1, borderColor: '#F5F0E8',
    },
    itemImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F5F0E8' },
    itemDetails: { flex: 1 },
    itemName: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    itemMeta: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: COLORS.text.muted,
        letterSpacing: 0.3, marginTop: 3, textTransform: 'uppercase',
    },
    itemDuration: { fontFamily: 'DMSans-Regular', fontSize: 13, color: COLORS.accent.primary, marginTop: 3 },

    specsList: { gap: 8 },
    specsLabel: {
        fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: COLORS.text.muted,
        letterSpacing: 0.5, marginBottom: 4,
    },
    specRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    specText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.primary },

    checklist: { gap: 8 },

    destinationCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9F2',
        borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#FACB9B',
    },
    destName: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.text.primary },
    destAddr: { fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
    navBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.accent.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    },
    navBtnText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#FFFFFF' },

    dropoffSection: { gap: 8 },
    dropoffTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    dropoffDesc: { fontFamily: 'DMSans-Regular', fontSize: 13, color: COLORS.text.muted, lineHeight: 18 },
    cameraBox: {
        height: 160, backgroundColor: '#F5F0E8', borderRadius: 16,
        borderWidth: 2, borderColor: '#E0D4C0', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    cameraText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted },
    dropoffPreview: { height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    dropoffImage: { width: '100%', height: '100%' },
    dropoffOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 12, flexDirection: 'row', justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    retakeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    retakeBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#FFFFFF' },
    photoConfirmBadge: {
        position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#5A7A4A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    photoConfirmText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#FFFFFF' },

    successBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#E8F5E2', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#C8E6B8',
    },
    successTitle: { fontFamily: 'DMSans-Medium', fontSize: 17, color: '#5A7A4A' },
    successSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: COLORS.text.muted, marginTop: 2 },

    miniStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    miniStatusText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 },

    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: COLORS.accent.primary, height: 56, borderRadius: 16, marginTop: 4,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnWarn: { backgroundColor: '#D98634' },
    primaryBtnText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#FFFFFF' },

    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.accent.primary,
    },
    secondaryBtnText: { fontFamily: 'DMSans-Medium', fontSize: 15, color: COLORS.accent.primary },
});
