namespace InControl.NativeProfile
{
	public class RazerOnzaTEControllerMacProfile : Xbox360DriverMacProfile
	{
		public RazerOnzaTEControllerMacProfile()
		{
			base.Name = "Razer Onza TE Controller";
			base.Meta = "Razer Onza TE Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)64768
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5769,
					ProductID = (ushort)64768
				}
			};
		}
	}
}
