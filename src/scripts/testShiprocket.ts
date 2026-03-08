/**
 * Shiprocket Integration Test Script
 *
 * Usage:
 *   npx ts-node src/scripts/testShiprocket.ts
 *
 * Tests run in order:
 *   1. Authentication (login to Shiprocket)
 *   2. Pincode serviceability check
 *   3. Create order (optional — needs a real order UUID)
 *   4. Track shipment by AWB (optional — needs a real AWB)
 *   5. Webhook simulation
 *   6. Cancel order (optional — needs a Shiprocket order ID)
 */
import 'dotenv/config';
import * as shiprocket from '../services/shiprocket.service';

const PICKUP_PINCODE = '110001';   // Delhi
const DELIVERY_PINCODE = '400001'; // Mumbai
const TEST_WEIGHT = 0.5;           // kg

// Set these to test create/track/cancel with real data
const TEST_ORDER_UUID = '5b15e647-23b7-4e73-b5a6-17c63def60c0'; // Your DB order UUID (leave empty to skip)
const TEST_AWB = '';        // AWB from a previous shipment (leave empty to skip)
const TEST_SHIPROCKET_ORDER_ID = 0; // Shiprocket order ID to cancel (0 to skip)

const log = (label: string, data: unknown) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${label}`);
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2));
};

const pass = (name: string) => console.log(`  ✅ ${name}`);
const fail = (name: string, err: string) => console.log(`  ❌ ${name}: ${err}`);

async function main() {
    console.log('\n🚀 Shiprocket Integration Tests\n');

    // --- 0. List Pickup Locations ---
    try {
        const axios = require('axios');
        const token = await (shiprocket as any).checkServiceability('110001', '110001', 0.5); // warm up auth
        // Access the cached token by calling the auth endpoint directly
        const { data: authData } = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD,
        });
        const { data: pickupData } = await axios.get('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', {
            headers: { Authorization: `Bearer ${authData.token}` },
        });
        const locations = pickupData?.data?.shipping_address || [];
        log('Pickup Locations', locations.map((l: any) => ({
            id: l.id,
            pickupLocation: l.pickup_location,
            address: l.address,
            city: l.city,
            pincode: l.pin_code,
        })));
    } catch (err: any) {
        fail('List Pickup Locations', err.message);
    }

    // --- 1. Serviceability (also proves auth works) ---
    try {
        const result = await shiprocket.checkServiceability(
            PICKUP_PINCODE,
            DELIVERY_PINCODE,
            TEST_WEIGHT,
            false
        );
        log('Serviceability (Prepaid)', {
            serviceable: result.serviceable,
            courierCount: result.availableCouriers.length,
            topCouriers: result.availableCouriers.slice(0, 3).map(c => ({
                name: c.courierName,
                rate: c.rate,
                etd: c.etd,
                cod: c.cod,
            })),
        });
        pass('Auth + Serviceability (Prepaid)');
    } catch (err: any) {
        fail('Auth + Serviceability', err.message);
        console.log('\n⛔ Auth failed — remaining tests will likely fail too.\n');
    }

    // --- 2. Serviceability with COD ---
    try {
        const result = await shiprocket.checkServiceability(
            PICKUP_PINCODE,
            DELIVERY_PINCODE,
            TEST_WEIGHT,
            true
        );
        log('Serviceability (COD)', {
            serviceable: result.serviceable,
            courierCount: result.availableCouriers.length,
        });
        pass('Serviceability (COD)');
    } catch (err: any) {
        fail('Serviceability (COD)', err.message);
    }

    // --- 3. Create Order (only if UUID provided) ---
    let shipmentId: number | null = null;
    let awbCode: string | null = null;

    if (TEST_ORDER_UUID) {
        try {
            const order = await shiprocket.createOrder({
                orderId: TEST_ORDER_UUID,
                orderDate: new Date().toISOString(),
                pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
                billingName: 'Test Customer',
                billingAddress: '123 Test Lane',
                billingCity: 'Mumbai',
                billingPincode: '400001',
                billingState: 'Maharashtra',
                billingCountry: 'India',
                billingEmail: 'test@bellariti.com',
                billingPhone: '9876543210',
                shippingIsBilling: true,
                items: [
                    { name: 'Test Ring', sku: 'TEST-RING-001', units: 1, sellingPrice: 5000 },
                ],
                paymentMethod: 'Prepaid',
                subTotal: 5000,
                weight: TEST_WEIGHT,
                length: 10,
                breadth: 10,
                height: 5,
            });
            log('Create Order', order);
            pass('Create Order');
            shipmentId = order.shipmentId;

            // --- 3b. Assign AWB ---
            const awbResult = await shiprocket.assignAWB(shipmentId);
            log('Assign AWB', awbResult);
            pass('Assign AWB');
            awbCode = awbResult.awbCode;

            // --- 3c. Request Pickup ---
            const pickup = await shiprocket.requestPickup(shipmentId);
            log('Request Pickup', pickup);
            pass('Request Pickup');
        } catch (err: any) {
            fail('Create Order / AWB / Pickup', err.message);
            if (err.response?.data) {
                log('Error Details', err.response.data);
            }
        }
    } else {
        console.log('\n⏭️  Skipping Create Order (set TEST_ORDER_UUID to test)');
    }

    // --- 4. Track by AWB ---
    const trackAwb = awbCode || TEST_AWB;
    if (trackAwb) {
        try {
            const tracking = await shiprocket.trackByAWB(trackAwb);
            log('Track by AWB', {
                awb: tracking.awb,
                status: tracking.currentStatus,
                courier: tracking.courierName,
                eventCount: tracking.events.length,
                latestEvent: tracking.events[0],
            });
            pass('Track by AWB');
        } catch (err: any) {
            fail('Track by AWB', err.message);
        }
    } else {
        console.log('⏭️  Skipping Track (no AWB available)');
    }

    // --- 5. Cancel Order ---
    const cancelId = TEST_SHIPROCKET_ORDER_ID;
    if (cancelId) {
        try {
            const result = await shiprocket.cancelOrder([cancelId]);
            log('Cancel Order', result);
            pass('Cancel Order');
        } catch (err: any) {
            fail('Cancel Order', err.message);
        }
    } else {
        console.log('⏭️  Skipping Cancel (set TEST_SHIPROCKET_ORDER_ID to test)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('  Done!');
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
