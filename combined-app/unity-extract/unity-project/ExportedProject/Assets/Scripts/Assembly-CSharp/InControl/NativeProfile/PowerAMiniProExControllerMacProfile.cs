namespace InControl.NativeProfile
{
	public class PowerAMiniProExControllerMacProfile : Xbox360DriverMacProfile
	{
		public PowerAMiniProExControllerMacProfile()
		{
			base.Name = "PowerA Mini Pro Ex Controller";
			base.Meta = "PowerA Mini Pro Ex Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5604,
					ProductID = (ushort)16128
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21274
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21248
				}
			};
		}
	}
}
