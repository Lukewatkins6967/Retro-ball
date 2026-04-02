namespace InControl.NativeProfile
{
	public class PDPAfterglowControllerMacProfile : Xbox360DriverMacProfile
	{
		public PDPAfterglowControllerMacProfile()
		{
			base.Name = "PDP Afterglow Controller";
			base.Meta = "PDP Afterglow Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[9]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)1043
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)64252
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63751
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)64253
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63744
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)275
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)63744
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)531
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)4779,
					ProductID = (ushort)769
				}
			};
		}
	}
}
