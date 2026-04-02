namespace InControl.NativeProfile
{
	public class BigBenControllerMacProfile : Xbox360DriverMacProfile
	{
		public BigBenControllerMacProfile()
		{
			base.Name = "Big Ben Controller";
			base.Meta = "Big Ben Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)5227,
					ProductID = (ushort)1537
				}
			};
		}
	}
}
