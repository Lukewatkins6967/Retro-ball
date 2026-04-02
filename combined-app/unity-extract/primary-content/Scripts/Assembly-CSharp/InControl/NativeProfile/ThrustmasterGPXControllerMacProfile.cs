namespace InControl.NativeProfile
{
	public class ThrustmasterGPXControllerMacProfile : Xbox360DriverMacProfile
	{
		public ThrustmasterGPXControllerMacProfile()
		{
			base.Name = "Thrustmaster GPX Controller";
			base.Meta = "Thrustmaster GPX Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1103,
					ProductID = (ushort)45862
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)23298
				}
			};
		}
	}
}
