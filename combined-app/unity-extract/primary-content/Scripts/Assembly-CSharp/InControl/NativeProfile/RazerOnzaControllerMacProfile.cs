namespace InControl.NativeProfile
{
	public class RazerOnzaControllerMacProfile : Xbox360DriverMacProfile
	{
		public RazerOnzaControllerMacProfile()
		{
			base.Name = "Razer Onza Controller";
			base.Meta = "Razer Onza Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)64769
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5769,
					ProductID = (ushort)64769
				}
			};
		}
	}
}
