export namespace Billing {
  export interface IInvoice {
    id: string;
    amount: number;
  }

  export interface IPayment_gateway {
    charge(invoice: IInvoice): Promise<boolean>;
  }
}
