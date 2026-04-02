namespace InControl.NativeProfile
{
	public class RazerSabertoothEliteControllerMacProfile : Xbox360DriverMacProfile
	{
		public RazerSabertoothEliteControllerMacProfile()
		{
			base.Name = "Razer Sabertooth Elite Controller";
			base.Meta = "Razer Sabertooth Elite Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5769,
					ProductID = (ushort)65024
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)23812
				}
			};
		}
	}
}
