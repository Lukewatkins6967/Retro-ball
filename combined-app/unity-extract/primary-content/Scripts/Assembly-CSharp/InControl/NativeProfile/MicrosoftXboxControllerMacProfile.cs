namespace InControl.NativeProfile
{
	public class MicrosoftXboxControllerMacProfile : Xbox360DriverMacProfile
	{
		public MicrosoftXboxControllerMacProfile()
		{
			base.Name = "Microsoft Xbox Controller";
			base.Meta = "Microsoft Xbox Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[7]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = ushort.MaxValue,
					ProductID = ushort.MaxValue
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)649
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)648
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)645
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)514
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)647
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1118,
					ProductID = (ushort)648
				}
			};
		}
	}
}
