import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Dimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { useBookingStore } from '@/store/bookingStore';
import { useLenderLocation } from '@/hooks/useLenderLocation';
import { COLORS } from '@/constants/theme';
import { UserProfile } from '@/types/user.types';
import { Tool } from '@/types/tool.types';

const { width, height } = Dimensions.get('window');

const MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f0e8" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#6b4226" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c8b89a" }] }
];

export default function TrackScreen() {
    const insets = useSafeAreaInsets();
    const { activeBooking, isLoading: isBookingLoading } = useBookingStore();
    const { lenderLocation, status, etaMinutes } = useLenderLocation(activeBooking?.id);

    const [lender, setLender] = useState<UserProfile | null>(null);
    const [tool, setTool] = useState<Tool | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeBooking) return;
            try {
                const [lenderDoc, toolDoc] = await Promise.all([
                    getDoc(doc(db, 'users', activeBooking.lenderId)),
                    getDoc(doc(db, 'tools', activeBooking.toolId))
                ]);

                if (lenderDoc.exists()) setLender(lenderDoc.data() as UserProfile);
                if (toolDoc.exists()) setTool(toolDoc.data() as Tool);
            } catch (error) {
                console.error('Error fetching tracking details:', error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [activeBooking]);

    useEffect(() => {
        if (lenderLocation && activeBooking?.borrowerLat && mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: lenderLocation.lat, longitude: lenderLocation.lng },
                { latitude: activeBooking.borrowerLat, longitude: activeBooking.borrowerLng }
            ], {
                edgePadding: { top: 180, right: 80, bottom: 350, left: 80 },
                animated: true
            });
        }
    }, [lenderLocation]);

    if (isBookingLoading || (activeBooking && isLoadingDetails)) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF7F50" />
            </View>
        );
    }

    if (!activeBooking) return null;

    const lenderFirstName = lender?.displayName.split(' ')[0] || 'Lender';

    return (
        <View style={styles.container}>
            {/* Top Status Banner */}
            <View style={[styles.topBanner, { paddingTop: insets.top + 10 }]}>
                <View style={styles.bannerRow}>
                    <View style={styles.bannerLeft}>
                        <View style={styles.bannerDot} />
                        <View>
                            <Text style={styles.bannerTitle}>{lenderFirstName} is on his way</Text>
                            <Text style={styles.bannerSub}>Lending your {tool?.name}</Text>
                        </View>
                    </View>
                    <Text style={styles.etaText}>~{etaMinutes || 8} min</Text>
                </View>
            </View>

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={MAP_STYLE}
                initialRegion={{
                    latitude: activeBooking.borrowerLat,
                    longitude: activeBooking.borrowerLng,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
            >
                {/* Borrower Marker (Your House) */}
                <Marker
                    coordinate={{
                        latitude: activeBooking.borrowerLat,
                        longitude: activeBooking.borrowerLng
                    }}
                >
                    <View style={styles.houseMarker}>
                        <View style={styles.houseIconContainer}>
                            <Ionicons name="home" size={14} color="#FFFFFF" />
                        </View>
                        <Text style={styles.markerLabel}>Your House</Text>
                    </View>
                </Marker>

                {/* Lender Marker (Vehicle/Truck) */}
                {lenderLocation && (
                    <Marker
                        coordinate={{
                            latitude: lenderLocation.lat,
                            longitude: lenderLocation.lng
                        }}
                    >
                        <View style={styles.vehicleMarker}>
                            <MaterialCommunityIcons name="truck-delivery" size={24} color="#FFFFFF" />
                        </View>
                    </Marker>
                )}

                {/* Polyline */}
                {lenderLocation && (
                    <Polyline
                        coordinates={[
                            { latitude: activeBooking.borrowerLat, longitude: activeBooking.borrowerLng },
                            { latitude: lenderLocation.lat, longitude: lenderLocation.lng }
                        ]}
                        strokeColor="#FF7F50"
                        strokeWidth={4}
                        lineDashPattern={[5, 10]}
                    />
                )}
            </MapView>

            {/* Distance Badge on Map */}
            <View style={[styles.distanceBadge, { top: insets.top + 140 }]}>
                <MaterialCommunityIcons name="navigation-variant" size={16} color="#FF7F50" style={{ transform: [{ rotate: '45deg' }] }} />
                <Text style={styles.distanceText}>0.4 mi left</Text>
            </View>

            {/* Map Controls */}
            <View style={styles.mapControls}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => {
                    if (lenderLocation) {
                        mapRef.current?.fitToCoordinates([
                            { latitude: lenderLocation.lat, longitude: lenderLocation.lng },
                            { latitude: activeBooking.borrowerLat, longitude: activeBooking.borrowerLng }
                        ], {
                            edgePadding: { top: 180, right: 80, bottom: 350, left: 80 },
                            animated: true
                        });
                    }
                }}>
                    <Ionicons name="add" size={24} color="#6B4226" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn}>
                    <Ionicons name="remove" size={24} color="#6B4226" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, { marginTop: 10 }]}>
                    <MaterialCommunityIcons name="target" size={24} color="#6B4226" />
                </TouchableOpacity>
            </View>

            {/* Content Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={[350, 500]}
                handleIndicatorStyle={{ backgroundColor: '#EDE4D4', width: 40 }}
                backgroundStyle={{ borderRadius: 32, backgroundColor: '#FFFFFF' }}
            >
                <BottomSheetView style={styles.sheetContent}>
                    {/* Header Row */}
                    <View style={styles.lenderHeader}>
                        <View style={styles.lenderProfile}>
                            <View style={styles.avatarWrapper}>
                                <Image source={{ uri: lender?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                                <View style={styles.onlineStatus} />
                            </View>
                            <View style={styles.lenderMeta}>
                                <Text style={styles.lenderNameText}>{lender?.displayName || 'Marcus P.'}</Text>
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.ratingText}>
                                        {lender?.lenderRating || '4.9'} <Text style={styles.lendsCount}>(124 lends)</Text>
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.msgBtn} onPress={() => router.push('/(borrower)/messages')}>
                                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#1C1410" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${lender?.phoneNumber}`)}>
                                <Ionicons name="call" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tool Summary Card */}
                    <View style={styles.toolCard}>
                        <Image source={{ uri: tool?.photoUrls?.[0] }} style={styles.toolImage} />
                        <View style={styles.toolCardInfo}>
                            <Text style={styles.transitText}>IN TRANSIT</Text>
                            <Text style={styles.toolCardName}>{tool?.name}</Text>
                        </View>
                        <View style={styles.enRouteBadge}>
                            <Text style={styles.enRouteText}>En Route</Text>
                        </View>
                    </View>

                    {/* Timeline */}
                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineLine} />
                        <View style={styles.timelineSteps}>
                            <TimelineStep label="CONFIRMED" isCompleted icon="checkmark" />
                            <TimelineStep label="EN ROUTE" isActive icon="truck-delivery" isMCI />
                            <TimelineStep label="DELIVERED" icon="cube-outline" />
                            <TimelineStep label="RETURNED" icon="camera-outline" />
                        </View>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        </View>
    );
}

function TimelineStep({ label, isActive, isCompleted, icon, isMCI }: any) {
    return (
        <View style={styles.stepWrapper}>
            <View style={[
                styles.stepCircle,
                isCompleted && styles.stepCircleCompleted,
                isActive && styles.stepCircleActive
            ]}>
                {isMCI ? (
                    <MaterialCommunityIcons name={icon} size={14} color={isActive || isCompleted ? "#FFFFFF" : "#BDC3C7"} />
                ) : (
                    <Ionicons name={icon} size={14} color={isActive || isCompleted ? "#FFFFFF" : "#BDC3C7"} />
                )}
            </View>
            <Text style={[styles.stepLabelText, (isActive || isCompleted) && styles.stepLabelActive]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FF7F50',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        zIndex: 10,
    },
    bannerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bannerDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    bannerTitle: {
        fontFamily: 'DMSans-Bold',
        fontSize: 18,
        color: '#FFFFFF',
    },
    bannerSub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    etaText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 20,
        color: '#FFFFFF',
    },
    map: {
        flex: 1,
    },
    houseMarker: {
        alignItems: 'center',
    },
    houseIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#BC9F77',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    markerLabel: {
        fontFamily: 'DMSans-Bold',
        fontSize: 10,
        color: '#1C1410',
        marginTop: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    vehicleMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF7F50',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    distanceBadge: {
        position: 'absolute',
        left: '50%',
        marginLeft: -60,
        width: 120,
        height: 36,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 5,
    },
    distanceText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 13,
        color: '#1C1410',
    },
    mapControls: {
        position: 'absolute',
        right: 20,
        bottom: 380,
    },
    controlBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sheetContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    lenderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    lenderProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#F5F0E8',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CD964',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    lenderMeta: {
        gap: 2,
    },
    lenderNameText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 20,
        color: '#1C1410',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 14,
        color: '#FFD700',
    },
    lendsCount: {
        fontFamily: 'DMSans-Regular',
        color: '#9A8070',
        fontSize: 13,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    msgBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F7F8FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    callBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF7F50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolCard: {
        backgroundColor: '#F8F9FB',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    toolImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    toolCardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    transitText: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 11,
        color: '#9A8070',
        letterSpacing: 1,
    },
    toolCardName: {
        fontFamily: 'DMSans-Bold',
        fontSize: 16,
        color: '#1C1410',
        marginTop: 2,
    },
    enRouteBadge: {
        backgroundColor: '#FFF1EB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    enRouteText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 12,
        color: '#FF7F50',
    },
    timelineContainer: {
        position: 'relative',
        height: 80,
    },
    timelineLine: {
        position: 'absolute',
        top: 14,
        left: 30,
        right: 30,
        height: 2,
        backgroundColor: '#F0F0F0',
    },
    timelineSteps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepWrapper: {
        alignItems: 'center',
        width: 70,
    },
    stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    stepCircleActive: {
        backgroundColor: '#FF7F50',
        borderWidth: 4,
        borderColor: '#FFF1EB',
        width: 34,
        height: 34,
        borderRadius: 17,
        marginTop: -2,
    },
    stepCircleCompleted: {
        backgroundColor: '#FF7F50',
    },
    stepLabelText: {
        fontFamily: 'DMSans-Bold',
        fontSize: 9,
        color: '#BDC3C7',
        marginTop: 8,
    },
    stepLabelActive: {
        color: '#1C1410',
    },
});
