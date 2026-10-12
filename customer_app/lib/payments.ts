
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiPost } from "./api-client";
import type { CreateRideRequest } from "./ride-request";
import { supabase } from "./supabase";

// What the app knows about the order before checkout. Price, codes and
// status are set server-side (create_order / Rust), never from here.
export type NewOrder = {
  pickup_lat: number;
  pickup_long: number;
  pickup_name: string | null;
  dropoff_lat: number;
  dropoff_long: number;
  dropoff_name: string | null;
  package_type: string | null;
  package_description: string | null;
  image_url: string | null;
  customer_phone: string | null;
};

// Rust finds the order by order_ref, checks the quoted price, initialises the
// Korapay charge (the secret key stays on the server) and returns the
// checkout page. Korapay redirects to redirect_url when done, which closes
// the browser session.
type KorapayCheckout = {
  checkout_url: string;
  reference: string;
  order_ref: string;
};

export async function payWithKorapay(
  order: NewOrder,
  request: Omit<CreateRideRequest, "payment_reference" | "order_ref">,
  // The estimated_price from Rust's own quote for the chosen ride type
  price: number,
): Promise<
  | { status: "paid"; reference: string; orderRef: string }
  | { status: "cancelled" }
  | { status: "error"; error: string }
> {
  // The awaiting_payment row this checkout is for
  let orderRef: string | null = null;
  // Set once Rust has a Korapay charge for it
  let reference: string | null = null;

  try {
    const { data: created, error: createError } = await supabase
      .rpc("create_order", {
        p_pickup_lat: order.pickup_lat,
        p_pickup_long: order.pickup_long,
        p_pickup_name: order.pickup_name,
        p_dropoff_lat: order.dropoff_lat,
        p_dropoff_long: order.dropoff_long,
        p_dropoff_name: order.dropoff_name,
        p_package_type: order.package_type,
        p_package_description: order.package_description,
        p_image_url: order.image_url,
        p_customer_phone: order.customer_phone,
      })
      .single<{ order_id: number; order_ref: string; order_code: string }>();
    if (createError || !created) {
      throw new Error(createError?.message ?? "Couldn't create your order.");
    }
    orderRef = created.order_ref;

    const redirect_url = Linking.createURL("payment-complete");
    const checkout = await apiPost<KorapayCheckout>(
      "/payments/korapay/initialize",
      { ...request, order_ref: orderRef, price, redirect_url },
    );
    if (!checkout) throw new Error("Payment couldn't be started. Please try again.");
    reference = checkout.reference;

    const result = await WebBrowser.openAuthSessionAsync(
      checkout.checkout_url,
      redirect_url,
    );
    if (result.type !== "success") {
      // The customer may have paid and closed the browser before the
      // redirect, so let Rust check the charge before cancelling
      return (await cancelUnpaidOrder(reference)) === "paid"
        ? { status: "paid", reference, orderRef }
        : { status: "cancelled" };
    }

    // Rust verifies the charge against this reference before the order
    // moves on to pending
    return { status: "paid", reference, orderRef };
  } catch (err: any) {
    console.error("❌ Korapay checkout failed:", err);
    if (reference) await cancelUnpaidOrder(reference);
    else if (orderRef) await discardUnpaidOrder(orderRef);
    return { status: "error", error: err?.message ?? "Payment failed" };
  }
}

// Initialize failed before Rust created a charge, so there's nothing to
// check with Korapay; just close the order the app created
async function discardUnpaidOrder(orderRef: string) {
  const { error } = await supabase.rpc("discard_unpaid_order", {
    p_order_ref: orderRef,
  });
  // Rust's sweep of stale awaiting_payment orders picks this one up
  if (error) console.error("❌ Couldn't discard unpaid order:", error.message);
}

// Rust asks Korapay about the charge: paid → the order carries on as
// normal; otherwise the awaiting_payment order is marked cancelled.
async function cancelUnpaidOrder(
  reference: string,
): Promise<"paid" | "cancelled"> {
  try {
    const result = await apiPost<{ status: "paid" | "cancelled" }>(
      "/payments/korapay/cancel",
      { reference },
    );
    return result?.status === "paid" ? "paid" : "cancelled";
  } catch (err) {
    // Rust's sweep of stale awaiting_payment orders picks this one up
    console.error("❌ Couldn't cancel unpaid order:", err);
    return "cancelled";
  }
}

// Cancelling after payment. Rust decides what's refunded: all of it while
// no rider has accepted, nothing once one has; after pickup it also opens a
// return (app_returned) so the rider brings the package back. App orders
// are named by their Korapay reference, which exists even when ride-request
// failed before returning an order id. Telegram orders pay differently and
// never cancel through here.
export type CancelOrderResult = {
  // naira; 0 when no refund is due, null when Rust's reply didn't say
  refund_amount: number | null;
};

// What the customer is told after a cancel. A rider may have accepted just
// before it, so this goes by what Rust actually refunded.
export function cancelledOrderMessage(refundAmount: number | null): string {
  if (refundAmount == null)
    return "Your delivery has been cancelled. Any refund due will go to your payment method.";
  if (refundAmount > 0)
    return `₦${refundAmount.toLocaleString()} will be refunded to your payment method.`;
  return "A rider had just accepted, so no refund is due.";
}

export async function cancelPaidOrder(
  paymentReference: string,
): Promise<{ data: CancelOrderResult | null; error: string | null }> {
  try {
    const data = await apiPost<CancelOrderResult>("/orders/cancel", {
      payment_reference: paymentReference,
    });
    // A 2xx means the cancel went through even if the body was empty
    return { data: { refund_amount: data?.refund_amount ?? null }, error: null };
  } catch (err: any) {
    console.error("❌ Couldn't cancel order:", err);
    return { data: null, error: err?.message ?? "Couldn't cancel the order" };
  }
}
