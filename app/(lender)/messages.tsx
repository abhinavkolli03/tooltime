import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import TabbedMessagesList from '@/components/messages/TabbedMessagesList';

export default function LenderMessagesScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
            </View>
            <TabbedMessagesList defaultTab="lending" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
    },
    title: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 32,
        color: COLORS.text.primary,
    },
});
